import { Message as DiscordMessage } from "discord.js";

import { Dict, mainGuild } from "../helpers/base";

import { parseCommand, sendMessage } from "./baseHelpers";
import {
  giveItem,
  inspect,
  inventory,
  items,
  takeItem,
  usage as ItemUsage
} from "./items";
import { doors, handleLock, links, usage as LinkUsage } from "./links";
import { move, usage as MovementUsage, userMove } from "./movement";
import { createRoom, deleteRoom, getAvailableRooms, usage as RoomUsage } from "./rooms";
import { members, showLogs, usage as UserUsage, users } from "./users";

export interface UsageDescription {
  admin?: boolean;
  example?: string;
  explanation?: string;
  use: string;
}

export interface Usage {
  adminOnly?: boolean;
  description: string;
  uses: UsageDescription[];
}

export type Action = Dict<Usage>;

const usages: Action = {
  ...ItemUsage,
  ...LinkUsage,
  ...MovementUsage,
  ...RoomUsage,
  ...UserUsage
};

const userUsages: Action = { };

for (const [command, usage] of Object.entries(usages)) {
  if (usage.adminOnly === true) continue;

  const uses: UsageDescription[] = usage.uses.filter(u => u.admin !== true);

  if (uses.length === 0) continue;

  userUsages[command] = {
    description: usage.description,
    uses
  };
}

async function help(msg: DiscordMessage): Promise<void> {
  const command = parseCommand(msg),
    commandName = command.params.join(""),
    isAdmin = msg.author.id === mainGuild().ownerID;

  const availableUsages: Action = isAdmin ? usages : userUsages;

  if (commandName === "") {
    const commands = Object.keys(availableUsages)
      .sort()
      .join("\n");

    sendMessage(msg, commands, true);
  } else {
    const usage = availableUsages[commandName];

    if (usage === undefined) {
      throw new Error(`The command "${commandName}" does not exist`);
    }

    let count = 1,
      message = `***${commandName}***: ${usage.description}\nUses:`;

    for (const use of usage.uses) {
      message += `\n${count++}: ${use.use}`;

      if (use.explanation !== undefined) {
        message += `\n${use.explanation}`;
      }

      if (use.example !== undefined) {
        message += `\nEX: ${use.example}`;
      }

      message += "\n";
    }

    sendMessage(msg, message, true);
  }
}

/**
 * A mapping of administrative actions to functions
 */
export const actions: Dict<(msg: DiscordMessage) => Promise<void>> = {
  "create-room": createRoom,
  "delete-room": deleteRoom,
  "doors": doors,
  "give": giveItem,
  "help": help,
  "inspect": inspect,
  "inventory": inventory,
  "items": items,
  "links": links,
  "lock": handleLock(true),
  "log": showLogs,
  "move": userMove,
  "mv": move,
  "rooms": getAvailableRooms,
  "take": takeItem,
  "unlock": handleLock(false),
  "users": users,
  "who": members
};
