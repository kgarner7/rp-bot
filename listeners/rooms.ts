import { Guild, Role } from "discord.js";

import { ChannelNotFoundError, ExistingChannelError } from "../config/errors";
import { mainGuild, requireAdmin } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";

import { Action } from "./actions";
import { adjacentRooms, getRoom, parseCommand, sendMessage } from "./baseHelpers";

export const usage: Action = {
  "create-room": {
    adminOnly: true,
    description: "Creates a new private room",
    uses: [{
      example: "!create-room testing room",
      use: "!create-room **room**"
    }]
  },
  "delete-room": {
    adminOnly: true,
    description: "destroys an existing room",
    uses: [{
      example: "!delete-room room a",
      use: "!delete-room **room**"
    }]
  },
  "rooms": {
    description: "Lists all rooms that you have visited and can currently access",
    uses: [{
      use: "!rooms"
    }]
  }
};

/**
 * Creates a private room and role
 * Requires admin privileges
 * @param msg the message we are processing
 */
export async function createRoom(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);

  const guild: Guild = mainGuild(),
    name: string = parseCommand(msg).params
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
export async function deleteRoom(msg: CustomMessage): Promise<void> {
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

export async function getAvailableRooms(msg: CustomMessage): Promise<void> {
  return new Promise((resolve: () => void): void => {
    const roomList: string[] = adjacentRooms(msg)
    .sort();

    sendMessage(msg,
      `Here are the rooms you can visit:\n${roomList.join("\n")}`,
      true);

    resolve();
  });
}
