import { TextChannel } from "discord.js";
import { Op } from "sequelize";

import { guild } from "../client";
import {
  Dict,
  isAdmin,
  lineEnd,
  requireAdmin,
} from "../helpers/base";
import { CustomMessage, SortableArray } from "../helpers/classes";
import { lock, unlock } from "../helpers/locks";
import { isNone, None, Undefined, ItemModel } from "../helpers/types";
import { Room, sequelize, User } from "../models/models";
import { ROOM_INFORMATION, USER_INVENTORY_CHANGE } from "../socket/consts";
import { inventoryToJson, roomToJson, triggerUser } from "../socket/helpers";

import { Action } from "./actions";
import {
  Command,
  getRoom,
  getRoomModel,
  parseCommand,
  sendMessage,
  ignorePromise
} from "./baseHelpers";

export const usage: Action = {
  change: {
    description:
      "Changes the description of an item (including creation and destruction)",
    uses: [
      {
        example: "!change paper for room delete",
        explanation: "Deletes the item paper in the room, 'room'",
        use: "!change **item** for **room** delete"
      }
    ]
  },
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
  edit: {
    description: "Edit the description of an editable item",
    uses: [
      {
        example: "!edit paper text \"a piece of paper\"",
        explanation: "Edits the description of the editable item wiht name, item name",
        use: "!edit **item name** text **description**"
      },
      {
        explanation: "Appends the description to the items'description",
        use: "!edit **item name** text **description** append"
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

// alias for friendliness
usage.examine = usage.inspect;

function senderName(msg: CustomMessage): string {
  return msg.channel instanceof TextChannel ? msg.author.toString() : "You";
}

function exclude<T>(arg: Dict<T>, excluded: string): Dict<T> {
  const newDict: Dict<T> = { };

  for (const [key, value] of Object.entries(arg)) {
    if (key === excluded) continue;

    newDict[key] = value;
  }

  return newDict;
}

export function getInt(value: string): number {
  const numOrNaN = parseInt(value, 10);

  if (isNaN(numOrNaN)) {
    throw new Error(`${value} is not a number`);
  } else if (numOrNaN <= 0) {
    throw new Error("Must have positive number");
  }

  return numOrNaN;
}

function missing(msg: CustomMessage, item: None<ItemModel>): boolean {
  return isNone(item) || (item.hidden === true && !isAdmin(msg));
}

/* function notifyUserInventoryChange(user: User): void {
  const json = JSON.stringify(inventoryToJson(user.inventory));
  triggerUser(user, USER_INVENTORY_CHANGE, json);
}

function notifyRoomInventoryChange(msg: CustomMessage, room: Room): void {
  if (msg.channel instanceof TextChannel) {
    const json = JSON.stringify([roomToJson(room, true, false)]);

    for (const member of msg.channel.members.values()) {
      if (!userIsAdmin(member)) {
        triggerUser(member, ROOM_INFORMATION, json);
      }
    }
  }

  const adminJson = JSON.stringify([roomToJson(room, true, false)]);

  getAdministrators(guild)
    .then(admins => {
      for (const admin of admins) {
        triggerUser(admin, ROOM_INFORMATION, adminJson);
      }
    })
    .catch(error => {
      console.error(error);
    });
}*/

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

  const redlock = await lock({ user: user.id});

  try {
    const item = user.inventory[itemName];

    if (missing(msg, item)) throw new Error(`You do not have ${itemName}`);
    else if (item.locked) throw new Error(`You cannot remove ${itemName}`);

    const itemQuantity = item.quantity || 1;

    if (quantity > itemQuantity) {
      const mesg = `You have ${item.quantity} ${itemName}, you cannot remove ${quantity}`;
      throw new Error(mesg);
    }

    if (quantity === itemQuantity) {
      user.inventory = exclude(user.inventory, itemName);
    } else {
      item.quantity = itemQuantity - quantity;
    }

    await user.update({
      inventory: user.inventory
    });

    // notifyUserInventoryChange(user);

    sendMessage(msg, `You consumed ${quantity} of ${itemName}`);
  } finally {
    await unlock(redlock);
  }
}

const ITEM_KEYWORDS = [
  "count",
  "delete",
  "edit",
  "for",
  "hide",
  "lock",
  "no-edit",
  "show",
  "text",
  "type",
  "unlock"
];

export async function changeItem(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);
  const command = parseCommand(msg, ITEM_KEYWORDS);

  if (!command.args.has("for")) {
    throw new Error("Missing target user/room");
  }

  const name = command.params[0],
    target = command.args.get("for")![0];
  let isRoom: boolean;

  if (command.args.has("type")) {
    const tempType = command.args.get("type")![0];
    if (tempType !== "room" && tempType !== "user") {
      throw new Error(`${tempType} is not a valid type`);
    }

    isRoom = tempType === "room";
  } else {
    isRoom = true;
  }

  if (isRoom) {
    await changeRoomItem(command, target, name, msg);
  } else {
    await changeUserItem(command, target, name);
  }
}

async function changeUserItem(command: Command, target: string, name: string):
Promise<void> {
  const user = await User.findOne({
    attributes: ["id"],
    where: {
      [Op.or]: [
        { discordName: target },
        { name: target }
      ]
    }
  });

  if (!user) throw new Error(`Could not find user ${user}`);

  const redlock = await lock({ user: user.id });

  await user.reload({ attributes: ["inventory"] });

  try {
    if (command.args.has("delete")) {
      user.inventory = exclude(user.inventory, name);
    } else {
      user.inventory[name] = createOrUpdateItem(command,
        user.inventory[name], name);
    }

    await user.update({ inventory: user.inventory });
    // notifyUserInventoryChange(user);
  } finally {
    await unlock(redlock);
  }
}

async function changeRoomItem(command: Command, target: string, name: string,
                              _msg: CustomMessage): Promise<void> {
  const roomModel = await getRoomModel(target);

  if (!roomModel) throw new Error(`Could not find room ${target}`);

  const redlock = await lock({ room: roomModel.id });

  try {
    await roomModel.reload({ attributes: ["inventory"]});
    const item = roomModel.inventory[name];

    if (command.args.has("delete")) {
      roomModel.inventory = exclude(roomModel.inventory, name);
    } else {
      const updatedItem = createOrUpdateItem(command, item, name);
      roomModel.inventory[name] = updatedItem;
    }

    await roomModel.update({ inventory: roomModel.inventory });
    // notifyRoomInventoryChange(msg, roomModel);
  } finally {
    await unlock(redlock);
  }
}

function setProperty(item: ItemModel, propName: "editable" | "hidden" | "locked",
                     command: Command, trueKey: string, falseKey: string): void {

  if (command.args.has(trueKey)) {
    item[propName] = true;
  } else if (command.args.has(falseKey)) {
    item[propName] = false;
  }
}

function createOrUpdateItem(command: Command, item: None<ItemModel>,
                            name: string): ItemModel {

  if (item) {
    setProperty(item, "editable", command, "edit", "no-edit");
    setProperty(item, "locked", command, "lock", "unlock");
    setProperty(item, "hidden", command, "hide", "show");

    if (command.args.has("text")) {
      item.description = command.args.get("text")!.join();
    }

    if (command.args.has("count")) {
      item.quantity = getInt(command.args.get("count")!.join());
    }

    return item;
  } else {
    const description = command.args.get("text");

    if (!description) {
      throw new Error(`Missing description for ${name}`);
    }

    const quantity = getInt((command.args.get("count") || ["1"]).join());

    return {
      description: description.join(),
      editable: command.args.has("edit"),
      hidden: command.args.has("hide"),
      locked: command.args.has("lock"),
      name,
      quantity
    };
  }
}

export async function dropItem(msg: CustomMessage): Promise<void> {
  const roomModel = await getRoom(msg, true);

  if (roomModel === null) {
    throw new Error("Could not find a room");
  }

  const user = await User.findOne({
    attributes: ["id"],
    where: {
      id: msg.author.id
    }
  });

  if (user === null) {
    throw new Error("Could not find a user for you");
  }

  const command = parseCommand(msg, ["of", "in"]);
  let itemName: string = command.params.join();
  let quantity = 1;

  if (command.args.has("of")) {
    quantity = getInt(itemName);
    itemName = command.args.get("of")!.join();
  }

  const redlock = await lock({ room: roomModel.id, user: user.id });

  try {
    await roomModel.reload({ attributes: ["inventory"] });
    await user.reload({ attributes: ["inventory"] });

    const item: Undefined<ItemModel> = user.inventory[itemName];

    if (missing(msg, item)) {
      throw new Error(`You do not have ${itemName}`);
    } else if (item.locked) {
      throw new Error(`You cannot drop ${itemName}: it is locked`);
    }

    console.log(item);

    const itemQuantity = item.quantity || 1;

    if (quantity > itemQuantity) {
      const message = `Cannot drop **${quantity}** of **${itemName}**` +
                      `${lineEnd}You have **${item.quantity}**`;
      throw new Error(message);
    }

    if (quantity === itemQuantity) {
      user.inventory = exclude(user.inventory, itemName);
    } else {
      item.quantity = itemQuantity - quantity;
    }

    let roomItem = roomModel.inventory[itemName];

    if (roomItem === undefined) {
      roomItem = { ...item, quantity};
      roomModel.inventory[itemName] = roomItem;
    } else {
      roomItem.quantity = (roomItem.quantity || 1) +  quantity;
    }

    const transaction = await sequelize.transaction();

    try {
      await roomModel.update({
        inventory: roomModel.inventory
      }, { transaction });

      await user.update({
        inventory: user.inventory
      }, { transaction });

      await transaction.commit();
      // notifyUserInventoryChange(user);
      // notifyRoomInventoryChange(msg, roomModel);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    sendMessage(msg,
      `${senderName(msg)} dropped ${quantity} of ${itemName} in ${roomModel.name}`);
  } catch (error) {
    throw error;
  } finally {
    await unlock(redlock);
  }
}

export async function editItem(msg: CustomMessage): Promise<void> {
  const command = parseCommand(msg, ["append", "text"]),
    itemName = command.params.join(" "),
    user = await User.findOne({
      attributes: ["id", "inventory"],
      where: {
        id: msg.author.id
      }
    });

  if (isNone(user)) throw new Error(`Could not find user with id ${msg.author.id}`);
  if (!command.args.has("text")) throw new Error("You must provide text");

  const redlock = await lock({ user: user.id });

  try {
    await user.reload({ attributes: ["inventory" ]});

    const item = user.inventory[itemName];

    if (isNone(item)) throw new Error(`You do not have ${itemName}`);
    else if (!item.editable) throw new Error(`You cannot edit ${itemName}`);

    let text = command.args.get("text")!.join(" ");
    if (command.args.has("append")) text = item.description + text;

    item.description = text;

    await user.update({ inventory: user.inventory });
    // notifyUserInventoryChange(user);
    sendMessage(msg, `Successfully updated ${itemName}`, true);
  } finally {
    await unlock(redlock);
  }
}

// eslint-disable-next-line complexity
export async function giveItem(msg: CustomMessage): Promise<void> {
  const command = parseCommand(msg, ["of", "to"]),
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

  if (target === undefined) throw new Error(`Could not find user "${targetJoined}"`);

  const senderUser = guild.members.resolve(sender.id)!,
    targetUser = guild.members.resolve(target.id)!;

  const senderSet: Set<string> = new Set(senderUser.roles.cache
      .map(r => r.name)),
    unionSet: Set<string> = new Set();

  for (const role of targetUser.roles.cache.values()) {
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

  if (rooms.length === 0) throw new Error("Must be in the same room to trade");

  const ofArg = command.args.get("of");
  let itemName: string = command.params.join(),
    quantity = 1;

  if (ofArg !== undefined) {
    quantity = getInt(itemName);
    itemName = ofArg.join();
  }

  const redlock = await lock({ user: [sender.id, target.id]});

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

    if (missing(msg, item)) {
      throw new Error(`You do not have "${itemName}"`);
    } else if (item.locked) {
      throw new Error(`You cannot give "${itemName}"`);
    }

    const itemQuantity = item.quantity || 1;

    if (quantity > itemQuantity) {
      const message = `Cannot give **${quantity}** of **${itemName}**` +
                      `${lineEnd}You have **${item.quantity}**`;
      throw new Error(message);
    }

    if (quantity === itemQuantity) {
      sender.inventory = exclude(sender.inventory, item.name);
    } else {
      item.quantity = itemQuantity - quantity;
    }

    const transaction = await sequelize.transaction();

    const targetItem = target.inventory[item.name];

    if (!targetItem) {
      target.inventory[item.name] = {...item, quantity};
    } else {
      targetItem.quantity = (targetItem.quantity || 1) + quantity;
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

      // notifyUserInventoryChange(sender);
      // notifyUserInventoryChange(target);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    const recipient = guild.members.resolve(target.id)!;

    sendMessage(msg,
      `${senderName(msg)} gave ${recipient} ${quantity} of ${itemName}`);

    if (!(msg.channel instanceof TextChannel)) {
      ignorePromise(recipient.send(`${msg.author} gave you ${quantity} of ${itemName}`));
    }
  } catch (error) {
    throw error;
  } finally {
    await unlock(redlock);
  }
}

/**
 * Shows all the items in a room
 * @param msg the message to be evaluated
 */
export async function items(msg: CustomMessage): Promise<void> {
  const roomModel = await getRoom(msg, true);

  if (roomModel) {
    const redlock = await lock({ room: roomModel.id });

    await roomModel.reload({
      attributes: ["inventory"]
    });

    try {
      if (Object.keys(roomModel.inventory).length === 0) {
        sendMessage(msg, "There are no items here");
      } else {
        let itemString = "";

        for (const item of Object.values(roomModel.inventory)) {
          if (!missing(msg, item)) {
            const ending = (item.hidden ? " hidden" : "") +
              (item.locked ? " locked" : "");
            itemString += `${item.name} (${item.quantity})${ending}${lineEnd}`;
          }
        }

        itemString = itemString.substr(0, itemString.length - 1);

        sendMessage(msg, `The following items are present: ${lineEnd}${itemString}`);
      }
    } catch (error) {
      throw error;
    } finally {
      await unlock(redlock);
    }
  }
}

export async function inspect(msg: CustomMessage): Promise<void> {
  const roomModel = await getRoom(msg, true),
    itemsList = parseCommand(msg),
    roomId = isNone(roomModel) ? undefined : roomModel.id;

  const redlock = await lock({ room: roomId, user: msg.author.id });

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
      await roomModel.reload({
        attributes: ["inventory"]
      });
      for (const item of itemsList.params) {
        const roomItem = roomModel.inventory[item];

        if (!missing(msg, roomItem)) {
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
        message += `Could not find ${item}${lineEnd}`;
      }
    } else {
      message = descriptions.join(lineEnd);
    }

    sendMessage(msg, message, privateMessage);
  } finally {
    await unlock(redlock);
  }
}

export async function inventory(msg: CustomMessage): Promise<void> {
  const admin = isAdmin(msg),
    user = await User.findOne({
      attributes: ["id"],
      where: {
        id: msg.author.id
      }
    });

  if (user === null) throw new Error("Invalid user");

  const redlock = await lock({ user: user.id });

  try {
    await user.reload({
      attributes: ["inventory"]
    });

    // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
    const userItems = Object.values(user.inventory)
      .sort()
      .filter(i => admin || !i.hidden)
      .map(i => `**${i.name}**:` +
        `(${i.quantity}${i.locked ? " locked" : ""}${i.editable ? " editable" : ""})`)
      .join(",");

    const message = userItems.length > 0 ?
      `You have the following items:${lineEnd}${userItems}` : "You have no items";

    sendMessage(msg, message, true);
  } catch (error) {
    throw error;
  } finally {
    await unlock(redlock);
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

  if (!roomModel || !user) return;

  const item = command.args.get("of");
  const joined = command.params.join();

  let itemName: string,
    quantity: number;

  if (item === undefined) {
    itemName = joined;
    quantity = 1;
  } else {
    quantity = getInt(joined);
    itemName = item.join();
  }

  const redlock = await lock({ room: roomModel.id, user: user.id });

  try {
    await roomModel.reload({
      attributes: ["inventory"]
    });

    await user.reload({
      attributes: ["inventory"]
    });

    const existing = roomModel.inventory[itemName];

    if (missing(msg, existing)) {
      throw new Error(`${itemName} does not exist in the room`);
    } else if (existing.locked) {
      throw new Error(`${itemName} cannot be removed`);
    }

    const itemQuantity = existing.quantity || 1;

    if (quantity > itemQuantity) {
      const err = `Cannot take **${quantity}** of **${itemName}**` +
                  `${lineEnd}There have **${existing.quantity}**`;
      throw new Error(err);
    }

    const transaction = await sequelize.transaction();

    try {
      existing.quantity = itemQuantity - quantity;

      if (existing.quantity === 0) {
        roomModel.inventory = exclude(roomModel.inventory, itemName);
      }

      await roomModel.update({
        inventory: roomModel.inventory
      }, {
        transaction
      });

      if (itemName in user.inventory) {
        user.inventory[itemName].quantity = (user.inventory[itemName].quantity || 1) + quantity;
      } else {
        user.inventory[itemName] = { ...existing, quantity};
      }

      await user.update({
        inventory: user.inventory
      }, {
        transaction
      });

      await transaction.commit();
      // notifyUserInventoryChange(user);
      // notifyRoomInventoryChange(msg, roomModel);

      sendMessage(msg, `${senderName(msg)} took ${quantity} of ${itemName}`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    throw error;
  } finally {
    await unlock(redlock);
  }
}
