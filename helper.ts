import {
  Guild,
  GuildMember,
  Message,
  Role,
  TextChannel
} from 'discord.js';
import { AccessError } from './config/errors';
import { RoomManager } from './rooms/roomManager';

let everyone: Role;
let guild: Guild;
let manager: RoomManager;

/**
 * Initializes the local server to be passed between modules
 * @param externalGuild the global server for this bot
 */
export function initGuild(externalGuild: Guild) {
  guild = externalGuild;
}

/**
 * Returns the shared guild. 
 * Should only be called after initialization
 * @returns {Discord.Guild} the shared guild instance
 */
export function mainGuild(): Guild {
  return guild;
}

export function initRooms(externalManager: RoomManager) {
  manager = externalManager;
}

export function roomManager(): RoomManager {
  return manager;
}

export function everyoneRole() {
  if (everyone !== undefined) {
    return everyone;
  } else {
    everyone = guild.roles.find(r => r.name === "@everyone");
    return everyone;
  }
}

/**
 * Gets the IDs of all members currently present in a channel
 * @param {Discord.Message} msg the message to be parsed
 * @returns {string[]} an array of the member of IDS when a message is sent
 */
export function getMembers(msg: Message): string[] {
  let users: string[] = [];
  
  if (msg.channel instanceof TextChannel) {
    msg.channel.members.forEach((member: GuildMember) => {
      if (member.user.bot !== true) {
        users.push(member.id);
      }
    });
  }

  return users;
}

/**
 * Throws an AccessError if the user is not an admin
 * @param msg the message we are handling
 * @throws {AccessError}
 */
export function requireAdmin(msg: Message) {
  if (msg.author.id !== mainGuild().ownerID) {
    throw new AccessError(msg.content);
  }
}

export type Dict<T> = { [k: string]: T };
export type FunctionResolvable = Function | string | string[];

export function toFunction(fn: FunctionResolvable, env: any): Function {
  if (fn instanceof Function) {
    return fn.bind(env);
  } else if (fn instanceof Array) {
    fn = fn.join("\n");
  }
  return new Function(fn).bind(env);
}