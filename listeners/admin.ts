import * as Discord from 'discord.js';
import moment from 'moment';
import tmp from 'tmp';
import { writeFileSync } from 'fs';
import { mainGuild, requireAdmin, roomManager, Dict } from '../helper';
import sequelize, { Message, Room as RoomModel, User, Room, Op } from '../models/models';
import { 
  AccessError,
  ChannelNotFoundError,
  ExistingChannelError,
  NoLogError 
} from '../config/errors';

type Command = {
  args: Dict<string[]>;
  params: string[];
};

export function parseFunction(msg: string, 
  words: Iterable<string> = ["in"]): Command {

  let keywords = new Set<string>(words);
  let split: string[] = msg.split(" ");
  let command: Command = {
    args: {},
    params: []
  }
  
  let argName: string = "";
  let built: string = "";
  let params: string[] = [];

  for (let part of split.slice(1)) {
    if (keywords.has(part)) {
      if (built.length > 0) {
        params.push(built);
        built = "";
      }

      if (argName === "") {
        command.params = params;
      } else {

        command.args[argName] = params;
      }

      argName = part;
      params = [];
    } else {
      let isList: boolean = false;
      if (part.endsWith(",")) {
        isList = true;
        part = part.substr(0, part.length - 1);
      }

      if (built.length > 0) {
        built += " ";
      }
      built += part;

      if (isList) {
        params.push(built);
        built = "";
      }
    }
  }

  if (built.length > 0) {
    params.push(built);
  }

  if (params.length > 0) {
    if (argName === "") {
      command.params = params;
    } else {
      command.args[argName] = params;
    }
  }
  
  return command;
}

type RoomName = { name: string, user: boolean } | null;

function roomName(msg: Discord.Message, override: boolean = false): RoomName {
  let command = parseFunction(msg.content);
  if (command.args.in === undefined || override === true) {
    if (msg.channel instanceof Discord.TextChannel) {
      return { 
        name: msg.channel.name, 
        user: false 
      };
    } else {
      return null;
    }
  } else {
    return { 
      name: command.args.in.join() as string, 
      user: true 
    };
  }
}

/**
 * Shows the logs for a channel. 
 * If this is called in a TextChannel, sends the logs of that channel. 
 * If called in a DM, sends the logs of a particular channel
 * @param {Discord.Message} msg the message we are handling
 */
async function showLogs(msg: Discord.Message) {
  function getChannel(name: string) {
    return RoomModel.findOne({
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
        [Op.or]: [
          { discordName: name },
          { name: name }
        ]
      }
    });  
  }
  let sender: Discord.User = msg.author;
  let channelName = roomName(msg);
  let name: string;
  let warning: string | null = null;

  if (channelName === null) {
    throw new NoLogError(msg);
  } else {
    name = channelName.name;
  }

  let room = await getChannel(name);

  if (room === null && channelName.user === true) {
    warning = `Could not find user requested room ${name}`;
    channelName = roomName(msg, true);

    if (channelName === null) {
      throw new NoLogError(msg);
    }

    name = channelName.name;
    room = await getChannel(name);
  }

  if (warning) {
    msg.author.send(warning);
  }

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
          name: `${name}-log.txt`
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
  let name: string = parseFunction(msg.content).params.join("");

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
  let room = await getRoom(msg);

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

function getRoomModel(name: string) {
  return RoomModel.findOne({
    where: {
      [Op.or]: [
        { discordName: name },
        { name: name }
      ]
    }
  });
}

async function getRoom(msg: Discord.Message, requirePresence: boolean = true) {
  let channel = roomName(msg);
  let roomModel: RoomModel | null = null;
  let guild = mainGuild();

  if (channel === null) return null;

  roomModel = await getRoomModel(channel.name)

  if (roomModel === null && channel.user === false) {
    channel = roomName(msg, true);
    if (channel) {
      roomModel = await getRoomModel(channel.name);

      msg.author.send(`Could not find room "${channel.name}", trying current room`);
    }
  }

  if (roomModel === null) return null;

  let member = guild.members.find(m => m.id === msg.author.id);

  if (requirePresence === true && member.roles
    .find(r => r.name === (roomModel as RoomModel).name) === null && 
    msg.author.id !== guild.ownerID) {

      msg.author.send("You are not currently in that room");
    return null;
  }

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
    let items = Object.keys(room.items);

    if (items.length === 0) {
      msg.reply("There are no items here");
    } else {
      msg.reply("The following items are present: \n" + 
        items.join("\n"));
    }
  }
}

async function inspect(msg: Discord.Message) {
  let roomModel = await getRoom(msg, true);
  let items = parseFunction(msg.content);
  
  if (roomModel) {
    let manager = roomManager();
    let room = manager.rooms[roomModel.name];
    
    let descriptions: string[] = [];
    for (let item of items.params) {
      if (item in room.items) {
        descriptions.push(`**${item}**: ${room.items[item].description}`)
      }
    }

    msg.channel.send(descriptions.join("\n"));
  }
}

async function move(msg: Discord.Message) {
  requireAdmin(msg);

  let command = parseFunction(msg.content, ["to"]);
  let guild = mainGuild();
  let manager = roomManager();
  let targetName = (command.args.to || []).join("\n");
  let targetRoom = await getRoomModel(targetName);

  if (targetRoom === null) {
    msg.author.send(`Could not find room ${targetName}`);
    return;
  }
  
  command.params.forEach(async (name: string) => {
    let member = guild.members.find((m: Discord.GuildMember) => { 
      return m.displayName === name || m.toString() === name;
    });

    if (member) {
      let roles: string[] = [];

      member.roles.forEach((r: Discord.Role) => {
        if (!manager.roles.has(r.id)) {
          roles.push(r.id)
        }
      });

      let newRole = guild.roles
        .find((r: Discord.Role) => r.name === (targetRoom as RoomModel).name);

      roles.push(newRole.id);

      await member.setRoles(roles);
      if (member.user.bot === false) {
        member.send(`You were moved to ${targetName}`);
      }
      
      msg.author
        .send(`Successfully moved ${member.displayName} to ${targetName}`);
    }
  });
}

/**
 * A mapping of administrative actions to functions
 */
let actions: Dict<Function> = {
  'create-room': createRoom,
  'delete-room': deleteRoom,
  'inspect': inspect,
  'items': items,
  'log': showLogs,
  'move': move,
  'who': members
}

export default actions;