import { GuildMember, Message as DiscordMessage, Role, TextChannel } from "discord.js";
import { Op } from "sequelize";

import { mainGuild, roomManager } from "../helpers/base";
import { Room as RoomModel } from "../models/models";
import { RoomManager } from "../rooms/roomManager";

/**
 * Gets the rooms adjacent to the target room
 */
export function adjacentRooms(msg: DiscordMessage): string[] {
  const manager = roomManager(),
    roomList: string[] = [];

  const member = mainGuild().members
      .get(msg.author.id)!,
    room = member.roles.find(r => manager.roles.has(r.id));

  if (room === null) return [];

  for (const name of manager.neighbors(msg.author.id, room.name)) {
    roomList.push(name);
  }

  return roomList;
}

/**
 * Represents the result of tokenizing a message
 */
export interface Command {
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
export function parseCommand(msg: string, words: Iterable<string> = ["in"]): Command {
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
export type RoomName = {
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
export function currentRoom(member: GuildMember): string | null {
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
export function getRoomName(msg: DiscordMessage, override: boolean = false): RoomName {
  const command: Command = parseCommand(msg.content);

  if (!command.args.has("in") || override) {
    if (msg.channel instanceof TextChannel) {
      return {
        name: msg.channel.name,
        user: false
      };
    } else {
      const name = currentRoom(mainGuild().members
        .get(msg.author.id)!);

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
export async function getRoomModel(name: string): Promise<RoomModel | null> {
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
export async function getRoom(msg: DiscordMessage,
                              requirePresence: boolean = true):
                              Promise<RoomModel | null> {

  let channel = getRoomName(msg),
    roomModel: RoomModel | null = null;

  const guild = mainGuild();

  if (channel === null) return null;

  roomModel = await getRoomModel(channel.name);

  if (roomModel === null && !channel.user) {
    channel = getRoomName(msg, true);
    if (channel !== null) {
      roomModel = await getRoomModel(channel.name);

      sendMessage(msg,
        `Could not find room "${channel.name}", trying current room`,
        true);
    }
  }

  if (roomModel === null) return null;

  const member = guild.members.get(msg.author.id)!;

  if (requirePresence && member.roles.find(r => r.name === roomModel!.name) === null
    && msg.author.id !== guild.ownerID) {

    sendMessage(msg, "You are not currently in that room", true);

    return null;
  }

  return roomModel;
}

export function sendMessage(msg: DiscordMessage, message: string,
                            isPrivate: boolean = false): void {

  if (!isPrivate && msg.channel instanceof TextChannel) {
    msg.channel.send(message)
      .catch((err: Error) => {
        console.error(err);
      });
  } else {
    msg.author.send(message);
 }
}
