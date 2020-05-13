import { GuildMember, TextChannel } from "discord.js";
import { Op } from "sequelize";

import { guild } from "../client";
import { CustomMessage } from "../helpers/classes";
import { Null } from "../helpers/types";
import { Room as RoomModel } from "../models/models";
import { manager } from "../rooms/roomManager";
import { isAdmin } from "../helpers/base";

const MAX_MESSAGE_SIZE = 1900;

/**
 * Gets the rooms adjacent to the target room
 */
export function adjacentRooms(msg: CustomMessage): string[] {
  const roomList: string[] = [];

  const member = guild.members.resolve(msg.author.id)!;

  if (!member) return [];

  const room = member.roles.cache.find(role => manager.roles.has(role.id));

  if (!room) return [];

  for (const name of manager.neighbors(msg.author.id, room.name)) {
    roomList.push(name);
  }

  return roomList;
}

/**
 * Represents the result of tokenizing a message
 */
export class Command {
  /** a mapping of keywords to their parameters */
  public args: Map<string, string[]> = new Map();
  /** a list of the default parameter(s) */
  public params: string[] = [];
}

/**
 * Takes a string and parses default parameters as well as
 * @param msg the string to evaluate
 * @param words the keywords to be evaluated
 */
export function parseCommand(msg: CustomMessage,
                             words: Iterable<string> = ["in"]): Command {
  let argName = "",
    built = "",
    isString = false,
    params: string[] = [],
    split: string[] = msg.content.split(" ");

  const keywords: Set<string> = new Set(words),
    command = new Command();

  if (split[0].startsWith("!")) split = split.splice(1);

  for (let part of split) {
    if (part.startsWith("\"") || part.startsWith("\'")) {
      isString = true;
    }
    if (keywords.has(part) && !isString) {
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

      if (part.endsWith(",") && !isString) {
        isList = true;
        part = part.substr(0, part.length - 1);
      }

      if (built.length > 0) built += " ";

      built += part;

      if (isList) {
        params.push(built);
        built = "";
      }

      if (part.endsWith("\"") || part.endsWith("\'")) {
        isString = false;
        built = built.substr(1, built.length - 2);
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
export type RoomName = Null<{
  /** the name of the room */
  name: string;
  /** whether this room was by found by user-defined name or not */
  user: boolean;
}>;

/**
 * Gets the current room of the message's author
 * @param msg the message we are evaluating
 * @returns the current room of the author, or null
 */
export function currentRoom(member: GuildMember): Null<string> {
  const role = member.roles.cache.find(r => manager.roles.has(r.id));

  return role  ? role.name: null;
}

/**
 * Attempts to get the name of a room based on the message or current location
 * @param msg the message we are evaluating
 * @param override whether to ignore user input
 * @returns the room name, or null
 */
export function getRoomName(msg: CustomMessage, override: boolean = false): RoomName {
  const command: Command = parseCommand(msg);

  if (!command.args.has("in") || override) {
    if (msg.channel instanceof TextChannel) {
      return {
        name: msg.channel.name,
        user: false
      };
    } else {
      const name = currentRoom(guild.members.resolve(msg.author.id)!);

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
export async function getRoomModel(name: string): Promise<Null<RoomModel>> {
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
export async function getRoom(msg: CustomMessage,
                              requirePresence: boolean = true):
                              Promise<Null<RoomModel>> {

  let channel = getRoomName(msg),
    roomModel: Null<RoomModel> = null;

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

  const member = guild.members.resolve(msg.author.id)!;

  if (requirePresence && member.roles.cache.find(r => r.name === roomModel!.name) === null
    && !isAdmin(msg)) {

    sendMessage(msg, "You are not currently in that room", true);

    return null;
  }

  return roomModel;
}

/**
 * Sends a messate to a user
 * @param msg the message of the sender
 * @param message the message to be sent
 * @param isPrivate  whether the message should be sent to the senders channel
 *  or privately
 */
export function sendMessage(msg: CustomMessage, message: string,
                            isPrivate: boolean = false): void {

  let target: GuildMember | TextChannel;

  if (msg.overridenSender) {
    target = msg.overridenSender;
  } else if (!isPrivate && msg.channel instanceof TextChannel) {
    target = msg.channel;
  } else {
    target = msg.member;
  }

  if (message.length < MAX_MESSAGE_SIZE) {
    target.send(message);
  } else {
    let idx = 0;

    while (idx < message.length) {
      const mesg = message.slice(idx, idx + MAX_MESSAGE_SIZE);
      target.send(mesg);

      idx += MAX_MESSAGE_SIZE;
    }
  }
}
