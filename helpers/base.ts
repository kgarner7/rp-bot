import {
  GuildMember,
  Message,
  TextChannel,
  Guild,
  PartialMessage
} from "discord.js";
import { NodeVM, VMScript } from "vm2";

import { guild } from "../client";
import { AccessError } from "../config/errors";

import { CustomMessage } from "./classes";

export const lineEnd = "\r\n";

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

export function userIsAdmin(user: GuildMember): boolean {
  return user.hasPermission("ADMINISTRATOR");
}

export function isAdmin(msg: CustomMessage): boolean {
  return userIsAdmin(msg.member);
}

/**
 * Throws an AccessError if the user is not an admin
 * @param msg the message we are handling
 * @throws {AccessError}
 */
export function requireAdmin(msg: CustomMessage): void {
  if (!isAdmin(msg)) throw new AccessError(msg.content);
}


export function idIsAdmin(id: string): boolean {
  const member = guild.members.resolve(id);
  return member !== null && userIsAdmin(member);
}

export function getAdministrators(adminGuild: Guild): IterableIterator<GuildMember> {
  return adminGuild.members.cache.filter(member =>
    member.permissions.has("ADMINISTRATOR") && !member.user.bot
  )
    .values();
}

export async function sentToAdmins(adminGuild: Guild, message: string): Promise<void> {
  for (const admin of getAdministrators(adminGuild)) {
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toFunction(fn: FunctionResolvable, env: any): Function {
  if (fn instanceof Function) return fn.bind(env);

  const fnString: string = Array.isArray(fn) ? fn.join(lineEnd) : fn,
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
