import async, { series } from "async";
import { Message as DiscordMessage, TextChannel } from "discord.js";

import { Dict, mainGuild, roomManager } from "../helpers/base";
import { SortableArray } from "../helpers/classes";
import { exists } from "../helpers/types";
import { Op, sequelize, User } from "../models/models";
import { Item, ItemModel } from "../rooms/item";

import { getRoom, parseCommand, sendMessage } from "./baseHelpers";

const roomLock: Set<string> = new Set(),
  userLock: Set<string> = new Set();

const lockQueue = async.queue(
  ({ release, room, user }: { release: boolean; room?: string; user?: string | string[] },
   callback: (err: Error | undefined | null) => void) => {

  async.until(() => {
    if (release) return true;

    let available = true;

    if (room !== undefined) available = !roomLock.has(room);

    if (user !== undefined) {
      if (user instanceof Array) {
        for (const requestedUser of user) {
          available = available && !userLock.has(requestedUser);
        }
      } else {
        available = available && !userLock.has(user);
      }
    }

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

      if (user !== undefined) {
        if (user instanceof Array) {
          for (const requestedUser of user) {
            userLock[method](requestedUser);
          }
        } else {
          userLock[method](user);
        }
      }

      // const message = `room: "${ room }", user: "${ user }"`;

      // console.log(`${release ? "Released" : "Acquired"} ${message}`);

      callback(undefined);
  });
}, 1);

function senderName(msg: DiscordMessage): string {
  return (msg.channel instanceof TextChannel) ? msg.author.toString() : "You";
}

/**
 * Requests to acquire or release a lock for a room and/or use
 * @param arg an object
 */
async function lock({ release, room, user }:
  { release: boolean; room?: string; user?: string | string[] }): Promise<void> {
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

// tslint:disable-next-line:cyclomatic-complexity
export async function giveItem(msg: DiscordMessage): Promise<void> {
  const command = parseCommand(msg, ["of", "to"]),
    targetName = command.args.get("to");

  if (targetName === undefined) throw new Error("Missing target user");

  const targetJoined = targetName.join();

  let users = await User.findAll({
    attributes: ["id", "name"],
    where: {
      [Op.or]: [
        { id: msg.author.id },
        { name: targetName }
      ]
    }
  });

  let sender: User | undefined,
    target: User | undefined;

  for (const user of users) {
    if (user.name === targetJoined) target = user;
    else if (user.id === msg.author.id) sender = user;
  }

  if (sender === undefined) throw new Error("You do not exist as a sender");

  if (target === undefined) {
    throw new Error(`Could not find user "${targetJoined}"`);
  }

  const ofArg = command.args.get("of");
  let itemName: string = command.params.join(),
    quantity = 1;

  if (ofArg !== undefined) {
    const paramAsNumber = parseInt(itemName, 10);

    if (isNaN(paramAsNumber)) {
      throw new Error(`"${itemName} is not an integer`);
    }

    itemName = ofArg.join();
    quantity = paramAsNumber;
  }

  await lock({ release: false, user: [sender.id, target.id]});

  try {
    users = await User.findAll({
      attributes: ["id", "inventory"],
      where: {
        id: {
          [Op.or]: [sender.id, target.id]
        }
      }
    });

    for (const user of users) {
      if (user.id === sender.id) sender = user;
      else if (user.id === target.id) target = user;
    }

    const item: ItemModel | undefined = sender.inventory[itemName];

    if (item === undefined) {
      throw new Error(`You do not have "${itemName}"`);
    }

    item.quantity -= quantity;

    if (item.quantity <= 0)  {
      quantity += item.quantity;

      const newInventory: Dict<ItemModel> = { };

      for (const [name, oldItem] of Object.entries(sender.inventory)) {
        if (oldItem !== item) {
          newInventory[name] = oldItem;
        }
      }

      sender.inventory = newInventory;
    }

    const transaction = await sequelize.transaction();

    const targetItem = target.inventory[item.name];

    if (targetItem === undefined) {
      target.inventory[item.name] = new Item(item);
      target.inventory[item.name].quantity = quantity;
    } else {
      targetItem.quantity += quantity;
    }

    try {
      await sender.update({
        inventory: sender.inventory
      }, {
        transaction
      });

      await target.update({
        inventory: target.inventory
      }, {
        transaction
      });

      transaction.commit();
    } catch (err) {
      transaction.rollback();
      throw err;
    }

    const recipient = mainGuild().members
      .get(target.id)!;

    sendMessage(msg,
      `${senderName(msg)} gave ${recipient} ${quantity} of ${itemName}`);

    if (!(msg.channel instanceof TextChannel)) {
      recipient.send(`${msg.author} gave you ${quantity} of ${itemName}`);
    }
  } catch (err) {
    throw err;
  } finally {
    await lock({ release: true, user: [sender.id, target.id]});
  }
}

/**
 * Shows all the items in a room
 * @param msg the message to be evaluated
 */
export async function items(msg: DiscordMessage): Promise<void> {
  const roomModel = await getRoom(msg);

  if (roomModel !== null) {
    await lock({ release: false, room: roomModel.id });

    try {
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
    } catch (err) {
      throw err;
    } finally {
      await lock({ release: true, room: roomModel.id });
    }
  }
}

export async function inspect(msg: DiscordMessage): Promise<void> {
  const roomModel = await getRoom(msg, true),
    itemsList = parseCommand(msg);

  if (roomModel !== null) {
    await lock({ release: false, room: roomModel.id });
    const descriptions = new SortableArray<string>();

    try {
      const room = roomManager().rooms
        .get(roomModel.name)!;

      for (const item of itemsList.params) {
        const roomItem = room.items.get(item);

        if (roomItem !== undefined) {
          descriptions.add(`**${item}**: ${roomItem.description}`);
        }

      }
    } catch (err) {
      throw err;
    } finally {
      sendMessage(msg, descriptions.join("\n"));
      await lock({ release: true, room: roomModel.id });
    }

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

  try {
    await user.reload({
      attributes: ["inventory"]
    });

    const userItems = Object.values(user.inventory)
      .sort()
      .map(i => `**${i.name}**: ${i.description} (${i.quantity})`)
      .join("\n");

    const message = userItems.length > 0 ?
      `You have the following items:\n${userItems}` : "You have no items";

    sendMessage(msg, message, true);
  } catch (err) {
    throw err;
  } finally {
    await lock({ release: true, user: user.id });
  }
}

export async function takeItem(msg: DiscordMessage): Promise<void> {
  const command = parseCommand(msg, ["of", "in"]),
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

    if (isNaN(value)) {
      throw new Error(`${joined} is not numeric`);
    }

    itemName = item.join();
    quantity = value;
  }

  await lock({ release: false, room: roomModel.id, user: user.id });

  try {
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

      sendMessage(msg, `${senderName(msg)} took ${quantity} of ${itemName}`);
    } catch (err) {
      existing.quantity += quantity;
      room.items.set(itemName, existing);

      await transaction.rollback();
    }
  } catch (err) {
    throw err;
  } finally {
    await lock({ release: true, room: roomModel.id, user: user.id });
  }
}
