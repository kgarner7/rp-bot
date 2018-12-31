import {
  Guild,
  GuildMember,
  Message,
  Role,
  TextChannel
} from "discord.js";
import { NodeVM, VMScript } from "vm2";

import { AccessError } from "./config/errors";
import { RoomManager } from "./rooms/roomManager";

let everyone: Role,
  guild: Guild,
  manager: RoomManager;

/**
 * Initializes the local server to be passed between modules
 * @param externalGuild the global server for this bot
 */
export function initGuild(externalGuild: Guild): void {
  guild = externalGuild;
}

/**
 * Returns the shared guild.
 * Should only be called after initialization
 * @returns the shared guild instance
 */
export function mainGuild(): Guild {
  return guild;
}

export function initRooms(externalManager: RoomManager): void {
  manager = externalManager;
}

export function roomManager(): RoomManager {
  return manager;
}

export function everyoneRole(): Role {
  if (everyone !== undefined) {
    return everyone;
  } else {
    everyone = guild.roles.find(r => r.name === "@everyone");

    return everyone;
  }
}

/**
 * Gets the IDs of all members currently present in a channel
 * @param msg the message to be parsed
 * @returns an array of the member of IDS when a message is sent
 */
export function getMembers(msg: Message): string[] {
  const users: string[] = [];

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
export function requireAdmin(msg: Message): void {
  if (msg.author.id !== mainGuild().ownerID) throw new AccessError(msg.content);
}

export interface Dict<T> { [k: string]: T; }
export type FunctionResolvable = Function | string | string[];

/**
 * Takes a function or string and binds it to the environment
 * @param fn the function or string to resolve
 * @param env the environment of the function to be evaluated
 */
// tslint:disable-next-line:no-any
export function toFunction(fn: FunctionResolvable, env: any): Function {
  if (fn instanceof Function) return fn.bind(env);

  const fnString = fn instanceof Array ? fn.join("\n"): fn,
    script = new VMScript(fnString),
    vm = new NodeVM({
      console: "inherit",
      sandbox: {
        self: env
      }
    });

  // safely binds the function to an environment
  return (): void => vm.run(script);
}
