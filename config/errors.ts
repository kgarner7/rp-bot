/* eslint-disable max-classes-per-file */
import { TextChannel } from "discord.js";

import { CustomMessage } from "../helpers/classes";

import { config } from "./config";

/**
 * Thrown when a non-admin attempts to call an admin function
 */
export class AccessError extends Error {
  public constructor(message: string) {
    const split = message.split(" ");
    const command: string = (split.length === 0 ? "" : split[0])
      .substring(config.prefix.length);

    super(`You do not have permissions to run the command ${command}`);

    this.name = "AccessError";
  }
}

/**
 * Thrown when attempting to use a nonexisting channel
 */
export class ChannelNotFoundError extends Error {
  public constructor(channel: string) {
    super(`The room ${channel} does not exist`);

    this.name = "ChannelNotFoundError";
  }
}

/**
 * Thrown when attempting to create an existing room
 */
export class ExistingChannelError extends Error {
  public constructor(channel: string) {
    super(`The room ${channel} already exists`);

    this.name = "ExistingChannelError";
  }
}

/**
 * Thrown when an invalid command is sent
 */
export class InvalidCommandError extends Error {
  public constructor(command: string) {
    super(`The command ${command} does not exist`);

    this.name = "InvalidCommandError";
  }
}

/**
 * Thrown when requesting logs but no logs exist for that channel
 */
export class NoLogError extends Error {
  public constructor(msg: CustomMessage) {
    super();

    if (msg.channel instanceof TextChannel) {
      this.message = `You have no logs for the room ${msg.channel.name}`;
    } else {
      this.message = "There are no logs for DM channels";
    }

    this.name = "NoLogError";
  }
}
