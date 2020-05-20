import {
  GuildMember,
  Message,
  Role,
  TextChannel,
  Guild,
  PartialMessage
} from "discord.js";
import { sync } from "glob";
import { readFile } from "jsonfile";
import { NodeVM, VMScript } from "vm2";

import { guild } from "../client";
import { AccessError } from "../config/errors";
import { User, UserResolvable } from "../models/user";

import { CustomMessage } from "./classes";
import { isNone, isUserResolvable, Undefined } from "./types";

export const lineEnd = "\r\n";

/**
 * Updates users with items
 * @param path the path to initialize users
 */
export async function initUsers(path: string): Promise<void> {
  for (const file of sync(`${path}/*.json`, { absolute : true})) {
    const module = await readFile(file);
    let user: UserResolvable;

    if (isUserResolvable(module)) {
      user = module;
    } else {
      continue;
    }

    for (const item of Object.values(user.inventory)) {
      if (isNone(item.quantity)) {
        item.quantity = 1;
      }
    }

    await User.upsert({
      discordName: user.discordName,
      id: user.id,
      inventory: user.inventory,
      name: user.name
    });
  }
}

/**
 * Gets the IDs of all members currently present in a channel
 * @param msg the message to be parsed
 * @returns an array of the member of IDS when a message is sent
 */
export function getMembers(msg: Message | PartialMessage): string[] {
  const users: string[] = [];

  if (msg.channel instanceof TextChannel) {
    for (const member of msg.channel.members.values()) {
      if (!member.user.bot) users.push(member.id);
    }
  }

  return users;
}

/**
 * Throws an AccessError if the user is not an admin
 * @param msg the message we are handling
 * @throws {AccessError}
 */
export function requireAdmin(msg: CustomMessage): void {
  if (!isAdmin(msg)) throw new AccessError(msg.content);
}

export function isAdmin(msg: CustomMessage): boolean {
  return userIsAdmin(msg.member);
}

export function userIsAdmin(user: GuildMember): boolean {
  return user.hasPermission("ADMINISTRATOR");
}

export function idIsAdmin(id: string): boolean {
  const member = guild.members.resolve(id);
  return member !== null && userIsAdmin(member);
}

export async function getAdministrators(guild: Guild): Promise<IterableIterator<GuildMember>> {
  return await guild.members.cache.filter(member => 
    member.permissions.has("ADMINISTRATOR") && !member.user.bot
  )
    .values();
}

export async function sentToAdmins(guild: Guild, message: string): Promise<void> {
  for (const admin of await getAdministrators(guild)) {
    await admin.send(message);
  }
}

export interface Dict<T> {
  [k: string]: T;
}
export type FunctionResolvable = Function | string | string[];

/**
 * Takes a function or string and binds it to the environment
 * @param fn the function or string to resolve
 * @param env the environment of the function to be evaluated
 */
// tslint:disable:no-any no-unsafe-any
export function toFunction(fn: FunctionResolvable, env: any): Function {
  if (fn instanceof Function) return fn.bind(env);

  const fnString: string = fn instanceof Array ? fn.join(lineEnd) : fn,
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
// tslint:enable:no-any no-unsafe-any
