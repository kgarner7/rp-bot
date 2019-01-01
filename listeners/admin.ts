import {
  Guild,
  GuildMember,
  Message as DiscordMessage,
  Role,
  TextChannel,
  User as DiscordUser
} from "discord.js";
import { writeFileSync } from "fs";
import moment from "moment";
import tmp from "tmp";

import {
  ChannelNotFoundError,
  ExistingChannelError,
  NoLogError
} from "../config/errors";
import { Dict, mainGuild, requireAdmin, roomManager } from "../helpers/base";
import { Link, Message, Op, Room as RoomModel, User } from "../models/models";
import { Neighbor, Room } from "../rooms/room";
import { RoomManager } from "../rooms/roomManager";

/**
 * Represents the result of tokenizing a message
 */
interface Command {
  /** a mapping of keywords to their parameters */
  args: Map<string, string[]>;
  /** a list of the default parameter(s) */
  params: string[];
}

/**
 * Takes a string and parses default parameters as well as
 * @param msg the string to evaluate
 * @param words the keywords to be evaluated
 */
export function parseFunction(msg: string,
                              words: Iterable<string> = ["in"]): Command {

  let argName = "",
    built = "",
    params: string[] = [],
    split: string[] = msg.split(" ");

  const keywords: Set<string> = new Set(words),
    command: Command = { args: new Map(), params: [] };

  if (split[0].startsWith("!")) split = split.splice(1);

  for (let part of split) {
    if (keywords.has(part)) {
      if (built.length > 0) {
        params.push(built);
        built = "";
      }

      if (argName === "") {
        command.params = params;
      } else {
        command.args.set(argName, params);
      }

      argName = part;
      params = [];
    } else {
      let isList = false;

      if (part.endsWith(",")) {
        isList = true;
        part = part.substr(0, part.length - 1);
      }

      if (built.length > 0) built += " ";

      built += part;

      if (isList) {
        params.push(built);
        built = "";
      }
    }
  }

  if (built.length > 0) params.push(built);

  if (argName === "") {
    command.params = params;
  } else {
    command.args.set(argName, params);
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
 * @param msg the message we are evaluating
 * @returns the current room of the author, or null
 */
function currentRoom(member: GuildMember): string | null {
  const manager: RoomManager = roomManager(),
    role: Role = member.roles.find(r => manager.roles.has(r.id));

  return role === null ? null : role.name;
}

/**
 * Attempts to get the name of a room based on the message or current location
 * @param msg the message we are evaluating
 * @param override whether to ignore user input
 * @returns the room name, or null
 */
function roomName(msg: DiscordMessage, override: boolean = false): RoomName {
  const command: Command = parseFunction(msg.content);

  if (!command.args.has("in") || override) {
    if (msg.channel instanceof TextChannel) {
      return {
        name: msg.channel.name,
        user: false
      };
    } else {
      const name = currentRoom(mainGuild().members
        .find(m => m.id === msg.author.id));

      return name === null ? null : {
        name,
        user: false
      };
    }
  } else {
    return {
      name: command.args.get("in")!.join(),
      user: true
    };
  }
}

/**
 * A wrapper for querying room by name or discord name
 * @param name the name (either initial, or Discord) of the room
 * we wish to find
 * @returns the room ()
 */
async function getRoomModel(name: string): Promise<RoomModel | null> {
  return RoomModel.findOne({
    where: {
      [Op.or]: [
        { discordName: name },
        { name }
      ]
    }
  });
}

/**
 * Attempts to find a corrresponding RoomModel based off a command
 * @param msg the message to be evaluated
 * @param requirePresence whether the author must have a role to see that room
 */
async function getRoom(msg: DiscordMessage,
                       requirePresence: boolean = true):
                       Promise<RoomModel | null> {

  let channel = roomName(msg),
    roomModel: RoomModel | null = null;

  const guild = mainGuild();

  if (channel === null) return null;

  roomModel = await getRoomModel(channel.name);

  if (roomModel === null && !channel.user) {
    channel = roomName(msg, true);
    if (channel !== null) {
      roomModel = await getRoomModel(channel.name);

      msg.author.send(`Could not find room "${channel.name}", trying current room`);
    }
  }

  if (roomModel === null) return null;

  const member = guild.members.find(m => m.id === msg.author.id);

  if (requirePresence && member.roles.find(r => r.name === roomModel!.name) === null
    && msg.author.id !== guild.ownerID) {

    msg.author.send("You are not currently in that room");

    return null;
  }

  return roomModel;
}

/**
 * Shows the logs for a channel.
 * If this is called in a TextChannel, sends the logs of that channel.
 * If called in a DM, sends the logs of a particular channel
 * @param msg the message we are handling
 */
async function showLogs(msg: DiscordMessage): Promise<void> {
  const sender: DiscordUser = msg.author;

  /**
   * A helper function for getting a room and all messages by date
   * @param nameOrDiscordName the name of the room
   */
  async function getChannel(nameOrDiscordName: string): Promise<RoomModel | null> {
    return RoomModel.findOne({
      include: [{
        attributes: ["createdAt", "message"],
        include: [{
          model: User,
          where: {
            id: sender.id
          }
        }, {
          as: "Sender",
          model: User
        }],
        model: Message
      }],
      order: [[Message, "createdAt", "ASC"]],
      where: {
        [Op.or]: [
          { discordName: nameOrDiscordName },
          { name: nameOrDiscordName }
        ]
      }
    });
  }

  let channelName: RoomName = roomName(msg),
    name: string,
    warning: string | null = null;

  if (channelName === null) {
    throw new NoLogError(msg);
  } else {
    name = channelName.name;
  }

  let room = await getChannel(name);

  if (room === null && channelName.user) {
    warning = `Could not find user requested room ${name}`;
    channelName = roomName(msg, true);

    if (channelName === null) throw new NoLogError(msg);

    name = channelName.name;
    room = await getChannel(name);
  }

  if (warning) msg.author.send(warning);

  if (room === null) {
    throw new NoLogError(msg);
  } else {
    tmp.file((err, path, _fd, callback) => {
      if (err || room === null) return;

      writeFileSync(path, room.Messages.map(message => {
        let senderName: string = message.Sender.name;

        if (message.Sender.id === sender.id) senderName = "You";

        const timeString: string =
          moment(message.createdAt)
          .format("M/DD/YY h:mm A");

        return `${senderName} (${timeString}): ${message.message}`;
      })
      .join("\n"));

      sender.send({
        files: [{
          attachment: path,
          name: `${name}-log.txt`
        }]
      })
      .then(() => {
        callback();
      })
      .catch(_err => {
        callback();
      });
    });
  }
}

/**
 * Creates a private room and role
 * Requires admin privileges
 * @param msg the message we are processing
 */
export async function createRoom(msg: DiscordMessage): Promise<void> {
  requireAdmin(msg);

  const guild: Guild = mainGuild(),
    name: string = parseFunction(msg.content).params
      .join("");

  if (name === "" || guild.channels.find(c => c.name === name) !== null) {
    throw new ExistingChannelError(name);
  }

  const role: Role = await guild.createRole({
    color: "RANDOM",
    name
  });

  const everyone: string = guild.roles.find(r => r.name === "@everyone").id;

  await guild.createChannel(name, "text", [{
    allow: ["READ_MESSAGES", "SEND_MESSAGES"],
    id: role.id
  }, {
    deny: ["READ_MESSAGES", "READ_MESSAGE_HISTORY", "SEND_MESSAGES"],
    id: everyone
  }]);

  await msg.author.send(`Successfully created room ${name}`);
}

/**
 * Attempts to destory an existing private room and role
 * Requires admin privileges
 * @param msg the message we are handling
 */
export async function deleteRoom(msg: DiscordMessage): Promise<void> {
  requireAdmin(msg);

  const guild = mainGuild(),
    room = await getRoom(msg);

  if (room !== null) {
    const channel = guild.channels.find(c => c.id === room.id),
      role: Role = guild.roles.find(r => r.name === name);

    if (channel !== null || role !== null) {
      if (channel !== null) await channel.delete();

      if (role !== null) await role.delete();

      msg.author.send(`Deleted room ${name}`);
    } else {
      throw new ChannelNotFoundError(name);
    }
  }
}

/**
 * Gets all the current individuals in a room
 * @param msg the message to be evaluated
 */
async function members(msg: DiscordMessage): Promise<void> {
  const guild = mainGuild(),
    room = await getRoom(msg);

  if (room === null) {
    msg.author
      .send("Either you do not have access to this room, or that room does not exist");
  } else {
    let memberString = "";
    const memberList = guild.roles.find(r => r.name === room.name).members;

    if (memberList.size === 0) {
      msg.channel.send(`There is no one in the ${room.name}`);

      return;
    }

    for (const [, member] of memberList.sort()) {
      if (member.user.bot || member.id === guild.ownerID) continue;

      memberString += `${member}, `;
    }

    memberString = memberString.substring(0, memberString.length - 2);

    msg.channel.send(`The following people are in ${room.name}: ${memberString}`);
  }
}

/**
 * Shows all the items in a room
 * @param msg the message to be evaluated
 */
async function items(msg: DiscordMessage): Promise<void> {
  const roomModel = await getRoom(msg);

  if (roomModel !== null) {
    const room: Room = roomManager().rooms
        .get(roomModel.name) as Room,
      itemsList = Object.keys(room.items);

    if (itemsList.length === 0) {
      msg.reply("There are no items here");
    } else {
      msg.reply("The following items are present: \n" +
        itemsList.join("\n"));
    }
  }
}

async function inspect(msg: DiscordMessage): Promise<void> {
  const roomModel = await getRoom(msg, true),
    itemsList = parseFunction(msg.content);

  if (roomModel !== null) {
    const descriptions: string[] = [],
      room = roomManager().rooms
        .get(roomModel.name)!;

    for (const item of itemsList.params) {
      const roomItem = room.items.get(item);
      if (roomItem !== undefined) {
        descriptions.push(`**${item}**: ${roomItem.description}`);
      }
    }

    msg.reply(descriptions.join("\n"));
  }
}

async function moveMember(member: GuildMember, target: string, source: string = ""):
                          Promise<void> {

  const manager: RoomManager = roomManager(),
    roles: string[] = [];

  async function linkHelper(from: string, to: string): Promise<void> {
    const link = await Link.findOne({
      include: [{
        as: "source",
        attributes: ["name"],
        model: RoomModel,
        where: { name: from }
      }, {
        as: "target",
        attributes: ["name"],
        model: RoomModel,
        where: { name: to }
      }]
    });

    if (link !== null) {
      try {
        await link.addVisitor(member.id);
        manager.links.get(from)!.get(to)!.visitors.add(member.id);
      } catch (err) {
        console.error((err as Error).stack);
      }
    }
  }

  for (const [, role] of member.roles) {
    if (!manager.roles.has(role.id)) roles.push(role.id);
  }

  const newRole: Role = mainGuild().roles
    .find(r => r.name === target);
  roles.push(newRole.id);

  if (source !== "") {
    await linkHelper(source, target);
    await linkHelper(target, source);
  }

  await member.setRoles(roles);
}

async function move(msg: DiscordMessage): Promise<void> {
  requireAdmin(msg);

  const command = parseFunction(msg.content, ["to"]),
    guild = mainGuild(),
    targetName = (command.args.get("to") || []).join("\n"),
    targetRoom = await getRoomModel(targetName);

  if (targetRoom === null) {
    msg.author.send(`Could not find room ${targetName}`);

    return;
  }

  for (const name of command.params) {
    const member = guild.members.find(m =>
      m.displayName === name || m.toString() === name);

    if (member !== null) {
      await moveMember(member, targetRoom.name);

      if (!member.user.bot) member.send(`You were moved to ${targetName}`);

      msg.author.send(`Successfully moved ${member.displayName} to ${targetName}`);
    }
  }
}

async function findRoomByCommand(command: Command, target: string): Promise<RoomModel> {
  const arr = command.args.get(target);
  let name: string;

  if (arr !== undefined) {
    name = arr.join();
  } else {
    throw new ChannelNotFoundError(`${target} channel`);
  }

  const model = await getRoomModel(name);

  if (model === null) throw new ChannelNotFoundError(name);

  return model;
}

function handleLock(locked: boolean): (msg: DiscordMessage) => Promise<void> {
  return async function changeLock(msg: DiscordMessage): Promise<void> {
    requireAdmin(msg);

    const args: {
      sourceId?: string;
      targetId?: string;
    } & Dict<string> = { },
      command = parseFunction(msg.content, ["from", "to"]),
      manager = roomManager();

    if (!command.args.has("from") && !command.args.has("to")) {
      throw new Error("You must provide a source and/or target room");
    }

    if (command.args.has("from")) {
      const fromModel = await findRoomByCommand(command, "from");
      args.sourceId = fromModel.id;
    }

    if (command.args.has("to")) {
      const toModel = await findRoomByCommand(command, "to");
      args.targetId = toModel.id;
    }

    const updated = await Link.update({
      locked
    }, {
      returning: true,
      where: args
    });

    const roomMap: Map<string, string> = new Map(),
      roomSet: Set<string> = new Set();

    for (const link of updated[1]) {
      roomSet.add(link.sourceId);
      roomSet.add(link.targetId);
    }

    const rooms = await RoomModel.findAll({
      attributes: ["id", "name"],
      where: {
        id: {
          [Op.or]: Array.from(roomSet)
        }
      }
    });

    for (const room of rooms) roomMap.set(room.id, room.name);

    const messageArray: string[] = [];

    for (const link of updated[1]) {
      const sourceName: string = roomMap.get(link.sourceId) as string,
        targetName: string = roomMap.get(link.targetId) as string,
        map = manager.links.get(sourceName);

      if (map !== undefined) {
        const neighbor = map.get(targetName);

        if (neighbor !== undefined) {
          neighbor.locked = link.locked;
          const start = `${link.locked ? "L" : "Un"}ocked`;
          messageArray.push(`${start} ${sourceName} => ${targetName} (${neighbor.name})`);
        }
      }
    }

    msg.author.send(messageArray.length > 0 ?
      messageArray.sort()
        .join("\n") :
        "No links changed");
  };
}

async function links(msg: DiscordMessage): Promise<void> {
  requireAdmin(msg);

  const args: {
    locked?: boolean;
    sourceId?: string;
    targetId?: string;
  } & Dict<string | boolean> = { },
    command = parseFunction(msg.content, ["locked", "unlocked", "from", "to"]),
    manager = roomManager();

  if (command.args.has("from")) {
    const source = await findRoomByCommand(command, "from");
    args.sourceId = source.id;
  }

  if (command.args.has("to")) {
    const target = await findRoomByCommand(command, "to");
    args.targetId = target.id;
  }

  if (command.args.has("locked")) {
    args.locked = true;
  } else if (command.args.has("unlocked")) {
    args.locked = false;
  }

  const linksList = await Link.findAll({
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

  const linkString = linksList.map((link: Link) => {
    const map = manager.links.get(link.source.name)!,
      neighbor = map.get(link.target.name)!,
      endString = link.locked ? ": locked" : "";

    return `${link.source.name} => ${link.target.name}${endString} (${neighbor.name})`;
  })
  .join("\n");

  if (linkString === "") {
    msg.author.send("No links found with those parameters");
  } else {
    msg.author.send(linkString);
  }
}

async function users(msg: DiscordMessage): Promise<void> {
  requireAdmin(msg);

  const guild = mainGuild();
  let message = "";

  const memberList = await User.findAll({
    attributes: ["id", "name"],
    include: [{
      as: "visitedLinks",
      attributes: ["locked"],
      include: [{
        as: "source",
        attributes: ["name"],
        model: RoomModel
      }, {
        as: "target",
        attributes: ["name"],
        model: RoomModel
      }],
      model: Link
    }],
    order: [
      ["name", "ASC"]
    ]
  });

  for (const member of memberList) {
    if (member.id === guild.owner.id) {
      continue;
    }

    const guildMember = guild.members
      .find(gm => gm.id === member.id);

    const room = currentRoom(guildMember),
      visitedRooms: Set<string> = new Set(room === null ? [] : [room]);
    let visitedString = room === null ? "" : room + ", ";

    const roomString: string = room === undefined ?
      "Not in any room" : `Currently in: ${room}`;

    for (const link of member.visitedLinks) {
      const source = link.source.name,
        target = link.target.name;

      if (!visitedRooms.has(source)) {
        visitedRooms.add(source);
        visitedString += source + ", ";
      }

      if (!visitedRooms.has(target)) {
        visitedRooms.add(target);
        visitedString += target + ", ";
      }
    }

    visitedString = visitedString.substr(0, visitedString.length - 2);

    if (visitedString.length === 0) visitedString = "No rooms visited";

    message += `${guildMember}\n${roomString}\n${visitedString}\n`;
  }

  msg.author.send(message);
}

function adjacentRooms(msg: DiscordMessage): string[] {
  const manager = roomManager(),
    roomList: string[] = [];

  const member = mainGuild().members
      .find(m => m.id === msg.author.id),
    room = member.roles.find(r => manager.roles.has(r.id));

  if (room === null) return [];

  for (const name of manager.neighbors(msg.author.id, room.name)) {
    roomList.push(name);
  }

  return roomList;
}

function getAvailableRooms(msg: DiscordMessage): void {
  const roomList: string[] = adjacentRooms(msg)
    .sort();

  msg.author.send(`Here are the rooms you can visit:\n${roomList.join("\n")}`);
}

async function userMove(msg: DiscordMessage): Promise<void> {
  const command = parseFunction(msg.content, ["through"]),
    guild = mainGuild(),
    manager = roomManager(),
    member = guild.members.find((m: GuildMember) => m.id === msg.author.id),
    name = command.params.join(),
    roomModel = await getRoom(msg, true);

  if (roomModel === null) throw new ChannelNotFoundError(name);

  const through = command.args.get("through");

  if (through !== undefined) {
    const door: string = through.join(),
      linkList = manager.links.get(roomModel.name);

    if (linkList !== undefined) {
      let targetNeighbor: Neighbor | undefined;

      for (const [, neighbor] of linkList.entries()) {
        if (neighbor.name === door) {
          targetNeighbor = neighbor;
          break;
        }
      }

      if (targetNeighbor === undefined) {
        throw new Error("There is no door of that name");
      } else {
        await moveMember(member, targetNeighbor.to, roomModel.name);

        return;
      }
    } else {
      throw new Error("There are no available neighbors");
    }
  }

  const neighbors: string[] = adjacentRooms(msg),
    targetRoom = await getRoomModel(name);

  if (targetRoom === null) {
    throw new Error("That room does not exist");
  } else if (neighbors.indexOf(targetRoom.name) === -1) {
    throw new Error("You cannot access that room");
  }

  moveMember(member, targetRoom.name);
}

async function doors(msg: DiscordMessage): Promise<void> {
  const manager = roomManager(),
    roomModel = await getRoom(msg, true);

  if (roomModel === null) {
    throw new Error("Not in proper channel");
  }

  let messageString = "";
  const linkList = manager.links.get(roomModel.name);

  if (linkList !== undefined) {
    for (const [, neighbor] of linkList.entries()) {
      messageString += neighbor.name;

      if (neighbor.visitors.has(msg.author.id) ||
        msg.author.id === mainGuild().ownerID) {
        messageString += ` => ${neighbor.to}`;
      } else {
        messageString += " => unknown";
      }

      if (neighbor.locked) messageString += ": locked";

      messageString += "\n";
    }

    msg.reply(messageString);
  } else {
    msg.reply("There are no doors in this room");
  }
}

/**
 * A mapping of administrative actions to functions
 */
export const actions: Dict<(msg: DiscordMessage) => Promise<void> | void> = {
  "create-room": createRoom,
  "delete-room": deleteRoom,
  "doors": doors,
  "inspect": inspect,
  "items": items,
  "links": links,
  "lock": handleLock(true),
  "log": showLogs,
  "move": userMove,
  "mv": move,
  "rooms": getAvailableRooms,
  "unlock": handleLock(false),
  "users": users,
  "who": members
};
