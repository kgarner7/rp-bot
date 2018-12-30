import {
  Guild,
  GuildMember,
  Message as DiscordMessage,
  Role,
  TextChannel,
  User as DiscordUser,
  Channel,
  GuildChannel
 } from 'discord.js';
import moment from 'moment';
import tmp from 'tmp';
import { writeFileSync } from 'fs';
import {
  mainGuild,
  requireAdmin,
  roomManager,
  Dict
} from '../helper';
import {
  Link,
  Message,
  Op,
  Room as RoomModel,
  User
} from '../models/models';
import {
  ChannelNotFoundError,
  ExistingChannelError,
  NoLogError
} from '../config/errors';
import {  Neighbor, Room } from '../rooms/room';
import { RoomManager } from '../rooms/roomManager';
import { Includeable } from 'sequelize';

/**
 * Represents the result of tokenizing a message
 */
type Command = {
  /** a mapping of keywords to their parameters */
  args: Dict<string[]>;
  /** a list of the default parameter(s) */
  params: string[];
};

/**
 * Takes a string and parses default parameters as well as
 * @param {string} msg the string to evaluate
 * @param {Iterable<string>} words the keywords to be evaluated
 */
export function parseFunction(msg: string,
  words: Iterable<string> = ["in"]): Command {

  let argName: string = "",
    built: string = "",
    params: string[] = [],
    keywords: Set<string> = new Set<string>(words),
    split: string[] = msg.split(" "),
    command: Command = {
    args: {},
    params: []
  }

  if (split[0].startsWith("!")) {
    split = split.splice(1);
  }

  for (let part of split) {
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

  if (argName === "") {
    command.params = params;
  } else {
    command.args[argName] = params;
  }

  return command;
}

/** Represents the name of a room and whether it was user-defined */
type RoomName = {
  /** the name of the room */
  name: string;
  /** whether this room was by found by user-defined name or not */
  user: boolean;
} | null;

/**
 * Gets the current room of the message's author
 * @param {DiscordMessage} msg the message we are evaluating
 * @returns {string | null} the current room of the author, or null
 */
function currentRoom(msg: DiscordMessage): string | null {
  let guild: Guild = mainGuild(),
    manager: RoomManager = roomManager(),
    member: GuildMember = guild.members.find((m: GuildMember) => m.id === msg.author.id),
    role: Role = member.roles.find((r: Role) => manager.roles.has(r.id));

  return role === null ? null: role.name;
}

/**
 * Attempts to get the name of a room based on the message or current location
 * @param {DiscordMessage} msg the message we are evaluating
 * @param {boolean} override whether to ignore user input
 * @returns {RoomName} the room name, or null
 */
function roomName(msg: DiscordMessage, override: boolean = false): RoomName {
  let command: Command = parseFunction(msg.content);

  if (command.args.in === undefined || override === true) {
    if (msg.channel instanceof TextChannel) {
      return {
        name: msg.channel.name,
        user: false
      };
    } else {
      let name: string | null = currentRoom(msg);

      return name === null ? null: {
        name: name,
        user: false
      }
    }
  } else {
    return {
      name: command.args.in.join() as string,
      user: true
    };
  }
}

/**
 * A wrapper for querying room by name or discord name
 * @param {string} name the name (either initial, or Discord) of the room
 * we wish to find
 * @returns {Promise<RoomModel | null>} the room ()
 */
async function getRoomModel(name: string): Promise<RoomModel | null> {
  return RoomModel.findOne({
    where: {
      [Op.or]: [
        { discordName: name },
        { name: name }
      ]
    }
  });
}

/**
 * Attempts to find a corrresponding RoomModel based off a command
 * @param {DiscordMessage} msg the message to be evaluated
 * @param {boolean} requirePresence whether the author must have a role to see that room
 */
async function getRoom(msg: DiscordMessage, requirePresence: boolean = true): Promise<RoomModel | null> {
  let channel = roomName(msg),
    guild = mainGuild(),
    roomModel: RoomModel | null = null;

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

  let member: GuildMember = guild.members.find(m => m.id === msg.author.id);

  if (requirePresence === true && member.roles
    .find(r => r.name === (roomModel as RoomModel).name) === null &&
    msg.author.id !== guild.ownerID) {

      msg.author.send("You are not currently in that room");
    return null;
  }

  return roomModel;
}

/**
 * Shows the logs for a channel.
 * If this is called in a TextChannel, sends the logs of that channel.
 * If called in a DM, sends the logs of a particular channel
 * @param {DiscordMessage} msg the message we are handling
 */
async function showLogs(msg: DiscordMessage) {
  /**
   * A helper function for getting a room and all messages by date
   * @param {string} name the name of the room
   */
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

  let channelName: RoomName = roomName(msg),
    name: string,
    sender: DiscordUser = msg.author,
    warning: string | null = null;

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
 * Requires admin privileges
 * @param {DiscordMessage} msg the message we are processing
 */
export async function createRoom(msg: DiscordMessage) {
  requireAdmin(msg);

  let guild: Guild = mainGuild(),
    name: string = parseFunction(msg.content).params.join("");

  if (name === "" || guild.channels.find(c => c.name === name) !== null) {
    throw new ExistingChannelError(name);
  }

  let role: Role = await guild.createRole({
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
 * Requires admin privileges
 * @param {DiscordMessage} msg the message we are handling
 */
export async function deleteRoom(msg: DiscordMessage) {
  requireAdmin(msg);

  let guild: Guild = mainGuild(),
    room: RoomModel | null = await getRoom(msg);

  if (room !== null) {
    let channel: Channel = guild.channels.find(c => c.id === (room as RoomModel).id),
      role: Role = guild.roles.find(r => r.name === name);

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

/**
 * Gets all the current individuals in a room
 * @param {DiscordMessage} msg the message to be evaluated
 */
async function members(msg: DiscordMessage) {
  let guild: Guild = mainGuild(),
    room: RoomModel | null = await getRoom(msg);

  if (room === null) {
    msg.author.send("Either you do not have access to this room, or that room does not exist");
  } else {
    let members: string = "";
    let users = guild.roles.find(r => r.name === (room as RoomModel).name).members

    if (users.size === 0) {
      msg.channel.send(`There is no one in the ${room.name}`);
      return;
    }

    for (let [,member] of users.sort()) {
      if (member.user.bot === true || member.id === guild.ownerID) {
        continue;
      }

      members += member + ", ";
    }

    msg.channel.send(`The following people are in ${room.name}: ${members.substring(0, members.length - 2)}`);
  }
}

/**
 * Shows all the items in a room
 * @param {DiscordMessage} msg the message to be evaluated
 */
async function items(msg: DiscordMessage) {
  let roomModel: RoomModel | null = await getRoom(msg);

  if (roomModel !== null) {
    let room: Room = roomManager().rooms[roomModel.name],
      items: string[] = Object.keys(room.items);

    if (items.length === 0) {
      msg.reply("There are no items here");
    } else {
      msg.reply("The following items are present: \n" +
        items.join("\n"));
    }
  }
}

async function inspect(msg: DiscordMessage) {
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

    msg.reply(descriptions.join("\n"));
  }
}

async function moveMember(member: GuildMember, name: string) {
  let guild = mainGuild(),
    manager = roomManager(),
    roles: string[] = [];

  member.roles.forEach((r: Role) => {
    if (!manager.roles.has(r.id)) {
      roles.push(r.id)
    }
  });

  let newRole = guild.roles.find((r: Role) => r.name === name);

  roles.push(newRole.id);
  await member.setRoles(roles);
}

async function move(msg: DiscordMessage) {
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
    let member = guild.members.find((m: GuildMember) => {
      return m.displayName === name || m.toString() === name;
    });

    if (member) {
      await moveMember(member, (targetRoom as RoomModel).name);

      if (member.user.bot === false) {
        member.send(`You were moved to ${targetName}`);
      }

      msg.author
        .send(`Successfully moved ${member.displayName} to ${targetName}`);
    }
  });
}

async function findRoomByCommand(command: Command, target: string) {
  let arr = command.args[target];
  let name: string;

  if (arr) {
    name = arr.join();
  } else {
    throw new ChannelNotFoundError(`${target} channel`);
  }

  let model = await getRoomModel(name);

  if (model === null) throw new ChannelNotFoundError(name);

  return model;
}

function handleLock(locked: boolean) {
  return async function changeLock(msg: DiscordMessage) {
    requireAdmin(msg);

    let args: Dict<string> = {},
      command: Command = parseFunction(msg.content, ["from", "to"]),
      manager: RoomManager = roomManager();

    if (command.args["from"] === undefined && command.args["to"] === undefined) {
      throw new Error("You must provide a source and/or target room");
    }

    if (command.args["from"] !== undefined) {
      let fromModel = await findRoomByCommand(command, "from");
      args["sourceId"] = fromModel.id;
    }

    if (command.args["to"] !== undefined) {
      let toModel = await findRoomByCommand(command, "to");
      args["targetId"] = toModel.id;
    }

    let updated = await Link.update({
      locked: locked
    }, {
      returning: true,
      where: args
    });

    let roomMap: Map<string, string> = new Map(),
      roomSet: Set<string> = new Set();

    for (let link of updated[1]) {
      roomSet.add(link.sourceId);
      roomSet.add(link.targetId);
    }

    let rooms = await RoomModel.findAll({
      attributes: ["id", "name"],
      where: {
        id: {
          [Op.or]: Array.from(roomSet)
        }
      }
    });

    for (let room of rooms) 
      roomMap.set(room.id, room.name);

    let messageArray: string[] = [];

    for (let link of updated[1]) {
      let sourceName: string = roomMap.get(link.sourceId) as string,
        targetName: string = roomMap.get(link.targetId) as string,
        map = manager.links.get(sourceName);

      if (map) {
        let neighbor = map.get(targetName);

        if (neighbor) {
          neighbor.locked = link.locked;
          messageArray.push(`${link.locked ? "L": "Un"}ocked ${sourceName} => ${targetName} (${neighbor.name})`);
        }
      }
    }

    msg.author.send(messageArray.length > 0 ? 
      messageArray.sort().join("\n"): "No links changed");
  }
}

async function links(msg: DiscordMessage) {
  requireAdmin(msg);

  let args: Dict<any> = {},
    command = parseFunction(msg.content, ["locked", "unlocked", "from", "to"]),
    manager = roomManager();

  if (command.args["from"]) {
    let source = await findRoomByCommand(command, "from");
    args.sourceId = source.id;
  }

  if (command.args["to"]) {
    let target = await findRoomByCommand(command, "to");
    args.targetId = target.id;
  }

  if (command.args["locked"]) {
    args["locked"] = true;
  } else if (command.args["unlocked"]) {
    args["locked"] = false;
  }

  let links = await Link.findAll({
    include: [{
      as: "source",
      attributes: ["name"],
      model: RoomModel
    }, {
      as: "target",
      attributes: ["name"],
      model: RoomModel
    }],
    order: [
      [{ model: RoomModel, as: "source" }, "name", "ASC"],
      [{ model: RoomModel, as: "target"}, "name", "ASC"]
    ],
    where: args
  });

  let string = links.map((link: Link) => {
    let map = manager.links.get(link.source.name) as Map<string, Neighbor>;
    let neighbor = (map.get(link.target.name) as Neighbor).name;
    return `Door ${neighbor}: ${link.source.name} => ${link.target.name}${link.locked ? ": locked": ""}`
  }).join("\n");

  if (string === "") {
    msg.author.send("No links found with those parameters");
  } else {
    msg.author.send(string);
  }
}

async function users(msg: DiscordMessage) {
  requireAdmin(msg);

  let guild = mainGuild();
  let manager = roomManager();
  let message = "";

  let members = await User.findAll({
    attributes: ["id", "name"],
    include: [
      {
        as: "visitedRooms",
        attributes: ["name"],
        model: RoomModel
      }
    ],
    order: [
      ["name", "ASC"],
      [{ as: "visitedRooms", model: RoomModel}, "name", "ASC"]
    ]
  });

  for (let member of members) {
    if (member.id === guild.owner.id) continue;

    let guildMember = guild.members
      .find((gm: GuildMember) => gm.displayName === member.name);

    let rooms: string[] = [];
    guildMember.roles.forEach((role: Role) => {
      if (manager.roles.has(role.id)) {
        rooms.push(role.name);
      }
    });

    let roomString = rooms.length === 0 ? "Not in any room":
      `Currently in: ${rooms.join(",")}`;
    let visitedString = member.visitedRooms.length === 0 ? "No visited rooms":
      `Visited: ${member.visitedRooms.map(room => room.name).join(",")}`;
    message += `${guildMember}\n${roomString}\n${visitedString}\n`;
  }

  msg.author.send(message);
}

function adjacentRooms(msg: DiscordMessage) {
  let manager = roomManager(),
  roomList: string[] = [];

  let member = mainGuild().members
    .find((m: GuildMember) => m.id === msg.author.id);
  let room = member.roles.find((r: Role) => manager.roles.has(r.id));

  for (let name of manager.neighbors(msg.author.id, room.name)) {
    roomList.push(name);
  }

  return roomList;
}

function getAvailableRooms(msg: DiscordMessage) {
  let roomList: string[] = adjacentRooms(msg).sort();

  msg.author.send(`Here are the rooms you can visit:\n${roomList.join("\n")}`);
}

async function userMove(msg: DiscordMessage) {
  let command = parseFunction(msg.content, ["through"]),
    guild = mainGuild(),
    manager = roomManager(),
    member = guild.members.find((m: GuildMember) => m.id === msg.author.id),
    name = command.params.join(),
    roomModel = await getRoom(msg, true);

  if (roomModel === null) throw new ChannelNotFoundError(name);

  if (command.args["through"]) {
    let door = command.args["through"].join(),
      links = manager.links.get(roomModel.name);

    if (links) {
      let targetRoom: string | undefined;

      for (let [, neighbor] of links.entries()) {
        if (neighbor.name === door) {
          targetRoom = manager.rooms[neighbor.to].name;
        }
      }

      if (targetRoom === undefined) {
        throw new Error("There is no door of that name");
      } else {
        await moveMember(member, targetRoom);
        return;
      }
    } else {
      throw new Error("There are no available neighbors");
    }
  }

  let neighbors = adjacentRooms(msg),
    targetRoom = await getRoomModel(name);

  if (targetRoom === null) {
    throw new Error("That room does not exist");
  } else if (neighbors.indexOf(targetRoom.name) === -1) {
    throw new Error("You cannot access that room");
  }

  moveMember(member, targetRoom.name);
}

async function doors(msg: DiscordMessage) {
  let manager = roomManager(),
    roomModel = await getRoom(msg, true);

  if (roomModel === null) {
    throw new Error("Not in proper channel");
  }

  let messageString = "",
    links = manager.links.get(roomModel.name);

  if (links) {
    for (let [,neighbor] of links.entries()) {
      let neighboringRoom = manager.rooms[neighbor.to];
      messageString += neighbor.name;

      if (neighboringRoom.visitors.has(msg.author.id) ||
        msg.author.id === mainGuild().ownerID) {
        messageString += ` => ${neighbor.to}`;
      } else {
        messageString += " => unknown";
      }

      if (neighbor.locked === true) {
        messageString += ": locked";
      }

      messageString += "\n";
    }

    msg.reply(messageString);
  } else {
    msg.reply(`There are no doors in this room`);
  }
}

/**
 * A mapping of administrative actions to functions
 */
let actions: Dict<Function> = {
  'admin-move': move,
  'create-room': createRoom,
  'delete-room': deleteRoom,
  'doors': doors,
  'inspect': inspect,
  'items': items,
  'links': links,
  'lock': handleLock(true),
  'log': showLogs,
  'move': userMove,
  'rooms': getAvailableRooms,
  'unlock': handleLock(false),
  'who': members,
  'users': users
}

export default actions;