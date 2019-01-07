import { Message as DiscordMessage } from "discord.js";

import { Dict } from "../helpers/base";

import { giveItem, inspect, inventory, items, takeItem } from "./items";
import { doors, handleLock, links } from "./links";
import { move, userMove } from "./movement";
import { createRoom, deleteRoom, getAvailableRooms } from "./rooms";
import { members, showLogs, users } from "./users";

/**
 * A mapping of administrative actions to functions
 */
export const actions: Dict<(msg: DiscordMessage) => Promise<void>> = {
  "create-room": createRoom,
  "delete-room": deleteRoom,
  "doors": doors,
  "give": giveItem,
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
