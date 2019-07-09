import { guild } from "../client";
import { Dict, lineEnd } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";

import { parseCommand, sendMessage } from "./baseHelpers";
import {
  changeItem,
  consume,
  dropItem,
  editItem,
  giveItem,
  inspect,
  inventory,
  items,
  takeItem,
  usage as ItemUsage
} from "./items";
import { doors, handleLock, hide, links, usage as LinkUsage } from "./links";
import { move, usage as MovementUsage, userMove } from "./movement";
import { play, stop, usage as PlayUsage } from "./music";
import { createItem, requests, usage as RequestUsage } from "./requests";
import { getAvailableRooms, usage as RoomUsage } from "./rooms";
import { deleteFile, read, save, update, usage as SaveUsage, write } from "./state";
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

export const usages: Action = {
  ...ItemUsage,
  ...LinkUsage,
  ...MovementUsage,
  ...RoomUsage,
  ...SaveUsage,
  ...PlayUsage,
  ...RequestUsage,
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

async function help(msg: CustomMessage): Promise<void> {
  const command = parseCommand(msg),
    commandName = command.params.join(""),
    isAdmin = msg.author.id === guild.ownerID;

  const availableUsages: Action = isAdmin ? usages : userUsages;

  if (commandName === "") {
    const commands = Object.keys(availableUsages)
      .sort()
      .join(lineEnd);

    sendMessage(msg, commands, true);
  } else {
    const usage = availableUsages[commandName];

    if (usage === undefined) {
      throw new Error(`The command "${commandName}" does not exist`);
    }

    let count = 1,
      message = `***${commandName}***: ${usage.description}${lineEnd}Uses:`;

    for (const use of usage.uses) {
      message += `${lineEnd}${count++}: ${use.use}`;

      if (use.explanation !== undefined) {
        message += `${lineEnd}${use.explanation}`;
      }

      if (use.example !== undefined) {
        message += `${lineEnd}EX: ${use.example}`;
      }

      message += lineEnd;
    }

    sendMessage(msg, message, true);
  }
}

/**
 * A mapping of administrative actions to functions
 */
export const actions: Dict<(msg: CustomMessage) => Promise<void>> = {
  change: changeItem,
  consume,
  create: createItem,
  delete: deleteFile,
  doors,
  drop: dropItem,
  edit: editItem,
  examine: inspect,
  give: giveItem,
  help,
  hide: hide(true),
  inspect,
  inventory,
  items,
  links,
  lock: handleLock(true),
  log: showLogs,
  move: userMove,
  mv: move,
  play,
  read,
  requests,
  rooms: getAvailableRooms,
  save,
  stop,
  take: takeItem,
  unhide: hide(false),
  unlock: handleLock(false),
  update,
  users,
  who: members,
  write
};
