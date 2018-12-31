/* tslint:disable:max-classes-per-file */
import * as Discord from "discord.js";

import { config } from "./config";

/**
 * Thrown when a non-admin attempts to call an admin function
 */
export class AccessError extends Error {
  public constructor(message: string) {
    const split = message.split(" "),
      command: string = (split.length === 0 ? "": split[0])
      .substring(config.prefix.length);

    super(`You do not have permissions to run the command ${command}`);
  }
}

/**
 * Thrown when attempting to use a nonexisting channel
 */
export class ChannelNotFoundError extends Error {
  public constructor(channel: string) {
    super(`The room ${channel} does not exist`);
  }
}

/**
 * Thrown when attempting to create an existing room
 */
export class ExistingChannelError extends Error {
  public constructor(channel: string) {
    super(`The room ${channel} already exists`);
  }
}

/**
 * Thrown when an invalid command is sent
 */
export class InvalidCommandError extends Error {
  public constructor(command: string) {
    super(`The command ${command} does not exist`);
  }
}

/**
 * Thrown when requesting logs but no logs exist for that channel
 */
export class NoLogError extends Error {
  public constructor(msg: Discord.Message) {
    if (msg.channel instanceof Discord.TextChannel) {
      super(`You have no logs for the room ${msg.channel.name}`);
    } else {
      super("There are no logs for DM channels");
    }
  }
}
