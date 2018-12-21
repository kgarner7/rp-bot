import * as Discord from 'discord.js';
import moment from 'moment';
import tmp from 'tmp';
import { writeFileSync } from 'fs';
import { mainGuild, requireAdmin } from '../helper';
import { Message, Room as RoomModel, User } from '../models/models';
import { 
  AccessError,
  ChannelNotFoundError,
  ExistingChannelError,
  NoLogError 
} from '../config/errors';

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
    let room: string = msg.content.split(" ")[1];

    if (room !== undefined) {
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

      writeFileSync(path, room.Messages.map((message: any) => {
        let name: string = message.Sender.name;
        if (message.Sender.id === sender.id) {
          name = "You";
        }
        return `${name} (${moment().format("M/DD/YY h:mm A")}): ${message.message}`;
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
  let name: string = msg.content.split(" ")[1] || "";
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
  let name: string = msg.content.substring(msg.content.indexOf(" ") + 1);
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
      console.log("DONE!");
    } else {
      throw new ChannelNotFoundError(name);
    }
  }
}

/**
 * A mapping of administrative actions to functions
 */
let actions: {[key: string]: Function} = {
  'create-room': createRoom,
  'delete-room': deleteRoom,
  'log': showLogs
}

export default actions;