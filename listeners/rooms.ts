import { Guild, Message as DiscordMessage, Role } from "discord.js";

import { ChannelNotFoundError, ExistingChannelError } from "../config/errors";
import { mainGuild, requireAdmin } from "../helpers/base";

import { adjacentRooms, getRoom, parseCommand, sendMessage } from "./baseHelpers";

/**
 * Creates a private room and role
 * Requires admin privileges
 * @param msg the message we are processing
 */
export async function createRoom(msg: DiscordMessage): Promise<void> {
  requireAdmin(msg);

  const guild: Guild = mainGuild(),
    name: string = parseCommand(msg.content).params
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

  sendMessage(msg, `Successfully created room ${name}`, true);
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
    const channel = guild.channels.get(room.id)!,
      role: Role = guild.roles.find(r => r.name === name);

    if (channel !== null || role !== null) {
      if (channel !== null) await channel.delete();

      if (role !== null) await role.delete();

      sendMessage(msg, `Deleted room ${name}`, true);
    } else {
      throw new ChannelNotFoundError(name);
    }
  }
}

export async function getAvailableRooms(msg: DiscordMessage): Promise<void> {
  return new Promise((resolve: () => void): void => {
    const roomList: string[] = adjacentRooms(msg)
    .sort();

    sendMessage(msg,
      `Here are the rooms you can visit:\n${roomList.join("\n")}`,
      true);

    resolve();
  });
}
