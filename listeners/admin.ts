import * as Discord from 'discord.js';
import moment from 'moment';
import tmp from 'tmp';
import { writeFileSync } from 'fs';
import { mainGuild, requireAdmin, roomManager } from '../helper';
import sequelize, { Message, Room as RoomModel, User, Room, Op } from '../models/models';
import { 
  AccessError,
  ChannelNotFoundError,
  ExistingChannelError,
  NoLogError 
} from '../config/errors';

function parseParameters(msg: Discord.Message) {
  let space = msg.content.indexOf(" ");
  if (space === -1) return "";
  else return msg.content.substring(space + 1);
}

/**
 * Shows the logs for a channel. 
 * If this is called in a TextChannel, sends the logs of that channel. 
 * If called in a DM, sends the logs of a particular channel
 * @param {Discord.Message} msg the message we are handling
 */
async function showLogs(msg: Discord.Message) {
  let sender: Discord.User = msg.author;
  let channelName: string = "";
  let channelId: string = msg.channel.id;

  if (msg.channel instanceof Discord.TextChannel) {
    channelName = msg.channel.name;
  } else {
    let room: string = parseParameters(msg);

    if (room.length > 0) {
      let roomModel = await getRoom(msg, false);
      
      let channel: Discord.GuildChannel = mainGuild().channels
        .find(c => c.name === room);
  
      if (channel !== null) {
        channelId = channel.id;
        channelName = channel.name;
      }
    } else {
      throw new NoLogError(msg);
    }
  }

  let room: RoomModel | null = await RoomModel.findOne({
    include: [{
      attributes: ["createdAt", "message"],
      model: Message,
      include: [{
        model: User,
        where: {
          id: sender.id
        }
      }, {
        as: "Sender",
        model: User
      }]
    }],
    order: [[Message, "createdAt", "ASC"]],
    where: {
      id: channelId
    }
  });

  if (room === null) {
    throw new NoLogError(msg);
  } else {
    tmp.file((err, path, _fd, callback) => {
      if (err || room === null) return;

      writeFileSync(path, room.Messages.map((message: Message) => {
        let name: string = message.Sender.name;
        if (message.Sender.id === sender.id) {
          name = "You";
        }
        
        return `${name} (${moment(message.createdAt).format("M/DD/YY h:mm A")}): ${message.message}`;
      }).join("\n"));

      sender.send({
        files: [{
          attachment: path,
          name: `${channelName}-log.txt`
        }]
      }).then(() => {
        callback();
      }).catch(err => {
        callback();
      });
    });
  }
}

/**
 * Creates a private room and role
 * @param {Discord.Message} msg the message we are processing
 * @throws {AccessError}
 * @throws {ExistingChannelError}
 */
export async function createRoom(msg: Discord.Message) {
  requireAdmin(msg);
  let name: string = parseParameters(msg);
  let guild: Discord.Guild = mainGuild();

  if (name === "" || guild.channels.find(c => c.name === name)) {
    throw new ExistingChannelError(name);
  }

  let role: Discord.Role = await guild.createRole({
    name: name,
    color: 'RANDOM'
  });

  let everyone: string = guild.roles.find(v => v.name === "@everyone").id;

  await guild.createChannel(name, 'text', [{
    allow: ["READ_MESSAGES", "SEND_MESSAGES"],
    id: role.id
  }, {
    id: everyone,
    deny: ["READ_MESSAGES", "READ_MESSAGE_HISTORY", "SEND_MESSAGES"],
  }]);
  await msg.author.send(`Successfully created room ${name}`);
}

/**
 * Attempts to destory an existing private room and role
 * @param {Discord.Message} msg the message we are handling
 * @throws {AccessError}
 * @throws {ChannelNotFoundError}
 */
export async function deleteRoom(msg: Discord.Message) {
  requireAdmin(msg);

  let guild = mainGuild();
  let name: string = parseParameters(msg);
  let room = await RoomModel.findOne({
    where: {
      name: name
    }
  });

  if (room !== null) {
    let channel = guild.channels.find(c => c.id === (room as RoomModel).id);
    let role = guild.roles.find(r => r.name === name);

    if (channel || role) {
      if (channel) {
        await channel.delete();
      }

      if (role) {
        await role.delete();
      }

      msg.author.send(`Deleted room ${name}`);
    } else {
      throw new ChannelNotFoundError(name);
    }
  }
}

async function getRoom(msg: Discord.Message, requirePresence: boolean = true) {
  let alternate = parseParameters(msg);
  let roomModel: RoomModel | null = null;
  let guild = mainGuild();

  if (alternate.length > 0) {
    roomModel = await RoomModel.findOne({
      where: {
        [Op.or]: [
          { discordName: alternate },
          { name: alternate }
        ]
      }
    });
  }

  if (roomModel === null) {
    roomModel = await RoomModel.findOne({
      where: {
        id: msg.channel.id
      }
    });
  }

  if (roomModel === null) return null;

  let member = guild.members.find(m => m.id === msg.author.id);

  if (requirePresence === true && member.roles
    .find(r => r.name === (roomModel as RoomModel).name) === null && 
    msg.author.id !== guild.ownerID) return null;

  return roomModel;
}

async function members(msg: Discord.Message) {
  let channel = msg.channel;
  let guild = mainGuild();
  let room = await getRoom(msg);

  if (room === null) {
    msg.author.send("Either you do not have access to this room, or that room does not exist");
  } else {
    let members: string = "";
    let users = guild.roles.find(r => r.name === (room as RoomModel).name).members
    
    if (users.size === 0) {
      channel.send(`There is no one in the ${room.name}`);
      return;
    }

    users.sort().forEach(m => {
      if (m.user.bot === true || m.id === guild.ownerID) {
        return;
      }
      members += m + ", ";
    });

    channel.send(`The following people are in ${room.name}: ${members.substring(0, members.length - 2)}`);
  }
}

async function items(msg: Discord.Message) {
  let roomModel = await getRoom(msg);
  
  if (roomModel) {
    let manager = roomManager();
    let room = manager.rooms[roomModel.name];
    
    if (room.items.length === 0) {
      msg.reply("There are no items here");
    } else {
      msg.reply("The following items are present: \n" + 
        room.items.map(i => i.name).join("\n"));
    }
  }
}

async function inspect(msg: Discord.Message) {
  let roomModel = await RoomModel.findOne({
    where: {
      id: msg.channel.id
    }
  });
  
  if (roomModel) {
    let manager = roomManager();
    let room = manager.rooms[roomModel.name];
  }
}

/**
 * A mapping of administrative actions to functions
 */
let actions: {[key: string]: Function} = {
  'create-room': createRoom,
  'delete-room': deleteRoom,
  'items': items,
  'log': showLogs,
  'who': members
}

export default actions;