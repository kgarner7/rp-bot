import { TextChannel } from "discord.js";

import { Dict, mainGuild, roomManager } from "../helpers/base";
import { CustomMessage, SortableArray } from "../helpers/classes";
import { lock } from "../helpers/locks";
import { isNone, Undefined } from "../helpers/types";
import { Op, Room, sequelize, User } from "../models/models";
import { Item, ItemModel } from "../rooms/item";

import { Action } from "./actions";
import { getRoom, parseCommand, sendMessage } from "./baseHelpers";

export const usage: Action = {
  consume: {
    description: "Removes a quantiy of items from your inventory. They cannot be locked",
    uses: [
      {
        example: "!consume 5 of a pizza",
        explanation: "Consumes 5 pizzas",
        use: "!consume **number** of **item**"
      }
    ]
  },
  drop: {
    description: "Drops a number of items into the room",
    uses: [
      {
        example: "!drop 5 of item 1",
        explanation: "Drops 5 of itme 1 in the current room",
        use: "!drop **number** of **item**"
      },
      {
        admin: true,
        example: "!drop 5 of item 1 in room a",
        explanation: "Drops 5 of itme 1 in the specified room",
        use: "!drop **number** of **item** in **room**"
      }
    ]
  },
  give: {
    description: "Gives item(s) to another player",
    uses: [
      {
        example: "!give item 1 to user a",
        explanation: "Gives one stack of an item to a user",
        use: "!give **item** to **user**"
      }, {
        example: "!give 3 of item 1 to user a",
        explanation: "Gives multiple stacks of an item you own to someone else",
        use: "!give **number** of **item** to **user**"
      }
    ]
  },
  inspect: {
    description: "Inspects an item in a room",
    uses: [
      {
        example: "!inspect item 1",
        use: "!inspect **item**"
      }, {
        admin: true,
        example: "!inspect item 1 in room a",
        use: "!inspect **item** in **room**"
      }
    ]
  },
  inventory: {
    description: "View your inventory",
    uses: [ { use: "!inventory" } ]
  },
  items: {
    description: "View all items in a room",
    uses: [
      { use: "!items" },
      {
        admin: true,
        example: "!items in room a",
        use: "!items in **room**"
      }
    ]
  },
  take: {
    description: "Take an item and add it to your inventory",
    uses: [
      {
        example: "take item 1",
        explanation: "Takes (1) of an item",
        use: "!take **item**"
      },
      {
        example: "take item 1 in room a",
        use: "!take **item** in **room**"
      },
      {
        example: "take 2 of item 1",
        explanation: "Takes (n > 0) of an item, up to its quantity",
        use: "!take **number** of **item**"
      },
      {
        admin: true,
        example: "take 2 of item 1 in room a",
        use: "!take **number** of **item** in **room**"
      }
    ]
  }
};

function senderName(msg: CustomMessage): string {
  return (msg.channel instanceof TextChannel) ? msg.author.toString() : "You";
}

function exclude<T>(arg: Dict<T>, excluded: string): Dict<T> {
  const newDict: Dict<T> = { };

  for (const [key, value] of Object.entries(arg)) {
    if (key === excluded) continue;

    newDict[key] = value;
  }

  return newDict;
}

function getInt(value: string): number {
  const numOrNaN = parseInt(value, 10);

  if (isNaN(numOrNaN)) {
    throw new Error(`${value} is not a number`);
  }

  return numOrNaN;
}

export async function consume(msg: CustomMessage): Promise<void> {
  const command = parseCommand(msg, ["of"]),
    user = await User.findOne({
    attributes: ["id", "inventory"],
    where: {
      id: msg.author.id
    }
  });

  if (isNone(user)) throw new Error(`Could not find a user ${msg.author.username}`);

  let itemName = command.params.join(), quantity = 1;

  if (command.args.has("of")) {
    quantity = getInt(itemName);
    itemName = command.args.get("of")!.join();
  }

  if (quantity < 1) throw new Error("Must be positive quantity");

  await lock({ release: false, user: user.id});

  try {
    const item: Undefined<ItemModel> = user.inventory[itemName];

    if (isNone(item)) throw new Error(`You do not have ${itemName}`);
    else if (item.locked) throw new Error(`You cannot remove ${itemName}`);

    if (quantity > item.quantity) {
      const mesg = `You have ${item.quantity} ${itemName}, you cannot remove ${quantity}`;
      throw new Error(mesg);
    }

    item.quantity -= quantity;

    await user.update({
      inventory: user.inventory
    });

    sendMessage(msg, `You dropped ${quantity} of ${itemName}`, true);
  } finally {
    await lock({ release: true, user: user.id });
  }
}

export async function dropItem(msg: CustomMessage): Promise<void> {
  const roomModel = await getRoom(msg, true);

  if (roomModel === null) {
    throw new Error("Could not find a room");
  }

  const room = roomManager().rooms
    .get(roomModel.name)!,
    user = await User.findOne({
    attributes: ["id"],
    where: {
      id: (msg.overridenSender ? msg.overridenSender : msg.author).id
    }
  });

  if (user === null) {
    throw new Error("Could not find a user for you");
  }

  const command = parseCommand(msg, ["of", "in"]);
  let itemName: string = command.params.join(),
    quantity = 1;

  if (command.args.has("of")) {
    quantity = getInt(itemName);
    itemName = command.args.get("of")!.join();
  }

  if (quantity <= 0) {
    throw new Error(`Cannot drop ${quantity} of ${itemName}`);
  }

  await lock({ release: false, room: roomModel.id, user: user.id });

  try {
    await roomModel.reload({ attributes: ["inventory"] });
    await user.reload({ attributes: ["inventory"] });

    const item: Undefined<ItemModel> = user.inventory[itemName];

    if (item === undefined) {
      throw new Error(`You do not have ${itemName}`);
    } else if (item.locked) {
      throw new Error(`You cannot drop ${itemName}: it is locked`);
    }

    if (quantity > item.quantity) {
      const message = `Cannot drop **${quantity}** of **${itemName}**` +
                      `\nYou have **${item.quantity}**`;
      throw new Error(message);
    }

    item.quantity -= quantity;

    if (item.quantity <= 0) {
      quantity += item.quantity;
      user.inventory = exclude(user.inventory, itemName);
    }

    let roomItem = room.items.get(itemName);

    if (roomItem === undefined) {
      roomItem = new Item({ ...item, quantity});
      room.items.set(itemName, roomItem);
    } else {
      roomItem.quantity += quantity;
    }

    const transaction = await sequelize.transaction();

    try {
      await roomModel.update({
        inventory: roomModel.inventory
      }, { transaction });

      await user.update({
        inventory: user.inventory
      }, { transaction });

      transaction.commit();
    } catch (err) {
      roomItem.quantity -= quantity;

      if (roomItem.quantity === 0) room.items.delete(itemName);

      transaction.rollback();
      throw err;
    }

    sendMessage(msg,
      `${senderName(msg)} dropped ${quantity} of ${itemName} in ${roomModel.name}`);
  } catch (err) {
    throw err;
  } finally {
    await lock({ release: true, room: roomModel.id, user: user.id });
  }
}

// tslint:disable-next-line:cyclomatic-complexity
export async function giveItem(msg: CustomMessage): Promise<void> {
  const command = parseCommand(msg, ["of", "to"]),
    guild = mainGuild(),
    targetName = command.args.get("to");

  if (targetName === undefined) throw new Error("Missing target user");

  const targetJoined = targetName.join();

  let users = await User.findAll({
    attributes: ["discordName", "id", "name"],
    where: {
      [Op.or]: [
        { id: msg.author.id },
        {
          [Op.or]: [
            { discordName: targetName },
            { name: targetName }
          ]
        }
      ]
    }
  });

  let sender: Undefined<User>,
    target: Undefined<User>;

  for (const user of users) {
    if (user.id === msg.author.id) {
      sender = user;
    } else if (user.name === targetJoined || user.discordName === targetJoined) {
      target = user;
    }
  }

  if (sender === undefined) throw new Error("You do not exist as a sender");

  if (target === undefined) {
    throw new Error(`Could not find user "${targetJoined}"`);
  }

  const senderUser = guild.members.get(sender.id)!,
    targetUser = guild.members.get(target.id)!;

  const senderSet: Set<string> = new Set(senderUser.roles
      .map(r => r.name)),
    unionSet: Set<string> = new Set();

  for (const role of targetUser.roles.values()) {
    if (senderSet.has(role.name)) {
      unionSet.add(role.name);
    }
  }

  const rooms = await Room.findAll({
    where: {
      name: {
        [Op.or]: Array.from(unionSet)
      }
    }
  });

  if (rooms.length === 0) {
    throw new Error("Must be in the same room to trade");
  }

  const ofArg = command.args.get("of");
  let itemName: string = command.params.join(),
    quantity = 1;

  if (ofArg !== undefined) {
    quantity = getInt(itemName);
    itemName = ofArg.join();
  }

  if (quantity <= 0) {
    throw new Error(`Cannot take ${quantity} items`);
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

    const item: Undefined<ItemModel> = sender.inventory[itemName];

    if (item === undefined) {
      throw new Error(`You do not have "${itemName}"`);
    } else if (item.locked) {
      throw new Error(`You cannot give "${itemName}"`);
    }

    if (quantity > item.quantity) {
      const message = `Cannot give **${quantity}** of **${itemName}**` +
                      `\nYou have **${item.quantity}**`;
      throw new Error(message);
    }

    item.quantity -= quantity;

    if (item.quantity <= 0)  {
      quantity += item.quantity;
      sender.inventory = exclude(sender.inventory, item.name);
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
export async function items(msg: CustomMessage): Promise<void> {
  const roomModel = await getRoom(msg, true);

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
          const ending = item.locked ? " locked" : "";
          itemString += `${item.name} (${item.quantity})${ending}\n`;
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

export async function inspect(msg: CustomMessage): Promise<void> {
  const roomModel = await getRoom(msg, true),
    itemsList = parseCommand(msg),
    roomId = isNone(roomModel) ? undefined : roomModel.id;

  await lock({ release: false, room: roomId, user: msg.author.id });

  try {
    const user = await User.findOne({
      attributes: ["inventory"],
      where: {
        id: msg.author.id
      }
    });

    const descriptions = new SortableArray<string>();
    const missingItems = new Set<string>(itemsList.params);

    if (!isNone(roomModel)) {
      const room = roomManager().rooms
      .get(roomModel.name)!;

      for (const item of itemsList.params) {
        const roomItem = room.items.get(item);

        if (!isNone(roomItem)) {
          descriptions.add(`**${item}**: ${roomItem.description}`);
          missingItems.delete(item);
        }
      }
    }

    let privateMessage = false;

    for (const item of new Set<string>(missingItems)) {
      const userItem = user!.inventory[item];

      if (!isNone(userItem)) {
        privateMessage = true;
        descriptions.add(`**${item}**: ${userItem.description} (in inventory)`);
        missingItems.delete(item);
      }
    }

    let message = "";

    if (missingItems.size > 0) {
      privateMessage = true;

      for (const item of missingItems) {
        message += `Could not find ${item}\n`;
      }
    } else {
      message = descriptions.join("\n");
    }

    sendMessage(msg, message, privateMessage);
  } finally {
    await lock({ release: true, room: roomId, user: msg.author.id});
  }
}

export async function inventory(msg: CustomMessage): Promise<void> {
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

export async function takeItem(msg: CustomMessage): Promise<void> {
  const command = parseCommand(msg, ["of", "in"]),
    roomModel = await getRoom(msg, true),
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
    quantity = getInt(joined);
    itemName = item.join();
  }

  if (quantity <= 0) {
    throw new Error(`Cannot take ${quantity} items`);
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

    if (quantity > existing.quantity) {
      const err = `Cannot take **${quantity}** of **${itemName}**` +
                  `\nYou have **${existing.quantity}**`;
      throw new Error(err);
    }

    const transaction = await sequelize.transaction();

    try {
      existing.quantity -= quantity;

      if (existing.quantity === 0) {
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
        user.inventory[itemName] = new Item({ ...existing, quantity});
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
