import async from "async";
import { Message as DiscordMessage } from "discord.js";

import { roomManager } from "../helpers/base";
import { SortableArray } from "../helpers/classes";
import { exists } from "../helpers/types";
import { sequelize, User } from "../models/models";
import { Item } from "../rooms/item";

import { getRoom, parseCommand, sendMessage } from "./baseHelpers";

const roomLock: Set<string> = new Set(),
  userLock: Set<string> = new Set();

const lockQueue = async.queue(
  ({ release, room, user }: { release: boolean; room?: string; user?: string },
   callback: (err: Error | undefined | null) => void) => {

  async.until(() => {
    if (release) return true;

    let available = true;

    if (room !== undefined) available = !roomLock.has(room);
    if (user !== undefined) available = available && !userLock.has(user);

    return available;
  },
    () => {
      // do nothing
     }, (err: Error | null | undefined) => {
      if (exists(err)) {
        callback(err);

        return;
      }

      const method: "delete" | "add" = release ? "delete" : "add";

      if (room !== undefined) roomLock[method](room);

      if (user !== undefined) userLock[method](user);

      const message = `room: "${ room }", user: "${ user }"`;

      console.log(`${release ? "Released" : "Acquired"} ${message}`);

      callback(undefined);
  });
}, 1);

/**
 * Requests to acquire or release a lock for a room and/or use
 * @param arg an object
 */
async function lock({ release, room, user }:
  { release: boolean; room?: string; user?: string }): Promise<void> {
  return new Promise((resolve: () => void): void => {
    lockQueue.push({ release, room, user },  (err: Error | undefined | null): void => {
      if (exists(err)) {
        console.error(err);

        throw err as Error;
      }

      resolve();
    });
  });
}

/**
 * Shows all the items in a room
 * @param msg the message to be evaluated
 */
export async function items(msg: DiscordMessage): Promise<void> {
  const roomModel = await getRoom(msg);

  if (roomModel !== null) {
    await lock({ release: false, room: roomModel.id });

    const room = roomManager().rooms
        .get(roomModel.name)!;

    if (room.items.size === 0) {
      sendMessage(msg, "There are no items here");
    } else {
      let itemString = "";

      for (const item of room.items.values()) {
        itemString += `${item.name} (${item.quantity})\n`;
      }

      itemString = itemString.substr(0, itemString.length - 1);

      sendMessage(msg, `The following items are present: \n${itemString}`);
    }

    await lock({ release: true, room: roomModel.id });
  }
}

export async function inspect(msg: DiscordMessage): Promise<void> {
  const roomModel = await getRoom(msg, true),
    itemsList = parseCommand(msg.content);

  if (roomModel !== null) {
    await lock({ release: false, room: roomModel.id });

    const descriptions = new SortableArray<string>(),
      room = roomManager().rooms
        .get(roomModel.name)!;

    for (const item of itemsList.params) {
      const roomItem = room.items.get(item);

      if (roomItem !== undefined) {
        descriptions.add(`**${item}**: ${roomItem.description}`);
      }
    }

    await lock({ release: true, room: roomModel.id });

    sendMessage(msg, descriptions.join("\n"));
  }
}

export async function inventory(msg: DiscordMessage): Promise<void> {
  const user = await User.findOne({
    attributes: ["id"],
    where: {
      id: msg.author.id
    }
  });

  if (user === null) throw new Error("Invalid user");

  await lock({ release: false, user: user.id });

  await user.reload({
    attributes: ["inventory"]
  });

  const userItems = Object.values(user.inventory)
    .sort()
    .map(i => `**${i.name}**: ${i.description} (${i.quantity})`)
    .join("\n");

  const message = userItems.length > 0 ?
    `You have the following items:\n${userItems}` : "You have no items";

  sendMessage(msg, message);

  await lock({ release: true, user: user.id });
}

export async function takeItem(msg: DiscordMessage): Promise<void> {
  const command = parseCommand(msg.content, ["of", "in"]),
    roomModel = await getRoom(msg),
    user = await User.findOne({
      attributes: ["id"],
      where: {
        id: msg.author.id
      }
    });

  if (roomModel === null || user === null) return;

  const item = command.args.get("of"),
    room = roomManager().rooms
      .get(roomModel.name)!,
    joined = command.params.join();

  let itemName: string,
    quantity: number;

  if (item === undefined) {
    itemName = joined;
    quantity = 1;
  } else {
    const value = parseInt(joined, 10);

    if (value === undefined) {
      throw new Error(`${joined} is not numeric`);
    }

    itemName = item.join();
    quantity = value;
  }

  await lock({ release: false, room: roomModel.id, user: user.id });

  await roomModel.reload({
    attributes: ["inventory"]
  });

  await user.reload({
    attributes: ["inventory"]
  });

  const existing = room.items.get(itemName);

  if (existing === undefined) {
    throw new Error(`${itemName} does not exist in the room`);
  } else if (existing.locked) {
    throw new Error(`${itemName} cannot be removed`);
  }

  const transaction = await sequelize.transaction();

  try {
    existing.quantity -= quantity;

    if (existing.quantity <= 0) {
      quantity += existing.quantity;
      room.items.delete(itemName);
    }

    await roomModel.update({
      inventory: room.items.serialize()
    }, {
      transaction
    });

    if (itemName in user.inventory) {
      user.inventory[itemName].quantity += quantity;
    } else {
      user.inventory[itemName] = new Item(existing);
      user.inventory[itemName].quantity = quantity;
    }

    await user.update({
      inventory: user.inventory
    }, {
      transaction
    });

    await transaction.commit();
  } catch (err) {
    existing.quantity += quantity;
    room.items.set(itemName, existing);

    await transaction.rollback();
  }

  await lock({ release: true, room: roomModel.id, user: user.id });
}
