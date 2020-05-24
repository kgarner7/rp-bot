import {
  GuildMember,
  Message as DiscordMessage,
  TextChannel,
  User as DiscordUser
} from "discord.js";
import { Op } from "sequelize";
import { Server, Socket } from "socket.io";

import { guild } from "../client";
import { Dict, idIsAdmin } from "../helpers/base";
import { lock, unlock } from "../helpers/locks";
import { None } from "../helpers/types";
import { usages } from "../listeners/actions";
import { currentRoom, getRoomModel } from "../listeners/baseHelpers";
import { Link, Message, Room, sequelize, User } from "../models/models";
import { ItemModel } from "../rooms/item";

import { sockets } from "./socket";
import { moveMember } from "../listeners/movement";

let serverSocket: Server;

export function setServer(socket: Server): void {
  serverSocket = socket;
}

export async function getUser(sock: Socket): Promise<None<User>> {
  if (sock.request.session && sock.request.session.userId) {
    return User.findOne({
      where: {
        id: sock.request.session.userId
      }
    });
  } else {
    return undefined;
  }
}

export function triggerUser(member: User | GuildMember | DiscordUser,
                            // tslint:disable-next-line:no-any
                            event: string, message: any): void {
  const notifiers = sockets.get(member.id);

  if (notifiers) {
    for (const socketId of notifiers) {
      serverSocket.to(socketId)
        .emit(event, message);
    }
  }
}

const roomAttributes = ["discordName", "id", "inventory", "name", "updatedAt"];

export async function getRooms(user: GuildMember | User): Promise<RoomJson[]> {
  const visibleRooms = new Set<string>();

  for (const [, channel] of guild.channels.cache) {
    if (channel instanceof TextChannel) {
      if (channel.members.has(user.id)) visibleRooms.add(channel.name);
    }
  }

  let messageRooms: Room[];

  if (idIsAdmin(user.id)) {
    messageRooms = await Room.findAll({ attributes: roomAttributes });
  } else {
    const transaction = await sequelize.transaction();

    const userModel = await User.findOne({
      attributes: ["id"],
      include: [{
        as: "visitedRooms",
        attributes: roomAttributes,
        model: Room,
        required: false
      }],
      transaction,
      where: {
        id: user.id
      }
    });

    messageRooms = userModel?.visitedRooms || [];

    const messageRoomNames = new Set<string>(messageRooms.map(room => room.name));

    const links = await Link.findAll({
      attributes: ["id"],
      include: [{
        as: "visitors",
        attributes: ["id"],
        model: User,
        where: {
          id: user.id
        }
      }, {
        as: "source",
        attributes: roomAttributes,
        model: Room
      }, {
        as: "target",
        attributes: roomAttributes,
        model: Room
      }],
      transaction
    });

    const visitedLinks = links.filter(link => link.visitors.length > 0);

    for (const link of visitedLinks) {
      if (!messageRoomNames.has(link.target.name)) {
        messageRooms.push(link.target);
        messageRoomNames.add(link.target.name);
      }

      if (!messageRoomNames.has(link.source.name)) {
        messageRooms.push(link.source);
        messageRoomNames.add(link.source.name);
      }
    }

    await transaction.commit();
  }

  return messageRooms.map(room => {
    const present = visibleRooms.has(room.discordName);
    return roomToJson(room, present, idIsAdmin(user.id));
  });
}

export interface RoomJson {
  c?: MinimalItem[];
  d: string;
  i: string;
  n: string;
  p?: boolean;
  s?: string;
}

export function roomToJson(room: Room, present: boolean,
                           isAdmin: boolean): RoomJson {

  const channel = guild.channels.resolve(room.id) as TextChannel;

  const json: RoomJson = {
    d: channel.topic || "",
    i: channel.id,
    n: room.name,
    s: channel.parent?.name
  };

  if (present) {
    json.c = inventoryToJson(room.inventory)
      .filter(item => isAdmin || !item.h);

    json.p = true;
  }

  return json;
}

export async function getArchivedRoomLogs(roomId: string, user: User, time: Date):
Promise<MinimalMessageWithoutChannel[]> {

  const room = await Room.findOne({
    attributes: ["id"],
    include: [{
      attributes: ["createdAt", "id", "message"],
      include: [{
        attributes: ["id"],
        model: User,
        where: {
          id: user.id
        }
      }, {
        as: "Sender",
        attributes: ["discordName", "id"],
        model: User
      }],
      model: Message,
      where: {
        createdAt: {
          [Op.lte]: time
        }
      }
    }],
    order: [[Message, "createdAt", "ASC"]],
    where: {
      id: roomId
    }
  });

  if (room) {
    return room.Messages.map(message => {
      return {
        a: message.Sender.discordName,
        d: message.createdAt!,
        i: message.id,
        t: message.message
      };
    });

  } else {
    return [];
  }
}

export interface MinimalItem {
  d: string;
  e?: boolean;
  h?: boolean;
  l?: boolean;
  n: string;
  q?: number;
}

export function itemToJson(item: ItemModel): MinimalItem {
  const itemJson: MinimalItem = {
    d: item.description,
    n: item.name
  };

  if (item.editable) itemJson.e = true;
  if (item.hidden) itemJson.h = true;
  if (item.locked) itemJson.l = true;
  if (item.quantity !== 1) itemJson.q = item.quantity;

  return itemJson;
}

export function inventoryToJson(inventory: Dict<ItemModel>): MinimalItem[] {
  return Object.values(inventory)
    .map(itemToJson);
}

export function triggerRoom(msg: DiscordMessage, action: string): void {
  if (msg.channel instanceof TextChannel) {
    msg.channel.members.forEach(member => triggerUser(member, action, msgToJson(msg)));
  }
}

export interface MinimalMessageWithChannel {
  a: string;
  c: string;
  d: number;
  i: string;
  t: string;
}

function msgToJson(msg: DiscordMessage): MinimalMessageWithChannel {
  return {
    a: msg.member?.displayName || "",
    c: msg.channel.id,
    d: msg.editedTimestamp || msg.createdTimestamp,
    i: msg.id,
    t: msg.content
  };
}

export interface MinimalMessageWithoutChannel {
  a: string;
  d: Date;
  i: string;
  t: string;
}

export interface ChannelWithMinimalMessages {
  d: string;
  n: string;
  m: MinimalMessageWithoutChannel[];
  s: string;
}

export async function getMessages(user: User | GuildMember | DiscordUser,
                                  time: Date): Promise<Dict<ChannelWithMinimalMessages>> {

  const messages = await Message.findAll({
    include: [{
      attributes: ["id", "name"],
      model: Room
    }, {
      attributes: ["id"],
      model: User,
      required: true,
      where: {
        id: user.id
      }
    }, {
      as: "Sender",
      attributes: ["discordName", "id"],
      model: User
    }],
    order: [["createdAt", "ASC"]],
    where: {
      createdAt: {
        [Op.gt]: time
      }
    }
  });

  const response: Dict<ChannelWithMinimalMessages> = { };

  for (const message of messages) {
    const messageJson = {
      a: message.Sender.discordName,
      d: message.createdAt!,
      i: message.id,
      t: message.message
    };

    const room = response[message.Room.id];

    if (room) {
      room.m.push(messageJson);
    } else {
      const channel = guild.channels.resolve(message.Room.id) as TextChannel;

      response[message.Room.id] = {
        d: channel.topic || "",
        m: [messageJson],
        n: message.Room.name,
        s: channel.parent!.name
      };
    }
  }

  let rooms: Room[] = [];

  if (idIsAdmin(user.id)) {
    rooms = await Room.findAll({});
  } else {
    const visitor = await User.findOne({
      include: [{
        as: "visitedRooms",
        model: Room
      }],
      where: {
        id: user.id
      }
    });

    if (visitor) {
      rooms = visitor.visitedRooms;
    }
  }

  for (const room of rooms) {
    if (!(room.id in response)) {
      const channel = guild.channels.resolve(room.id) as TextChannel;

      response[room.id] = {
        d: channel.topic || "",
        m: [],
        n: room.name,
        s: channel.parent!.name
      };
    }
  }

  return response;
}

export interface MinimalCommand {
  a?: boolean;
  d: string;
  u: MinimalUsage[];
}

export interface MinimalUsage {
  a?: boolean;
  e?: string;
  u: string;
  x?: string;
}

export function getCommands(isAdmin: boolean): Dict<MinimalCommand> {
  const commands: Dict<MinimalCommand> = { };

  for (const [name, description] of Object.entries(usages)) {
    if (description.adminOnly && !isAdmin) continue;

    const command: MinimalCommand = {
      d: description.description,
      u: []
    };

    if (description.adminOnly) command.a = true;

    for (const use of description.uses) {
      if (use.admin && !isAdmin) continue;

      const usage: MinimalUsage = { u: use.use };
      if (use.admin) usage.a = true;
      if (use.example) usage.x = use.example;
      if (use.explanation) usage.e = use.explanation;

      command.u.push(usage);
    }

    if (command.u.length > 0) {
      commands[name] = command;
    }
  }

  return commands;
}

export interface MinimalRoomWithLink {
  l: MinimalLink[];
  n: string;
}

export interface MinimalLink {
  h?: boolean;
  l?: boolean;
  n: string;
  t: string;
}

export async function createMap(user: GuildMember | User): Promise<MinimalRoomWithLink[]> {
  let rooms: Room[];

  if (idIsAdmin(user.id)) {
    rooms = await Room.findAll({
      attributes: ["name"],
      include: [{
        as: "sources",
        include: [{
          as: "target",
          attributes: ["name"],
          model: Room
        }],
        model: Link,
        required: false
      }]
    });


  } else {
    const userModel = await User.findOne({
      attributes: ["id"],
      include: [{
        as: "visitedRooms",
        attributes: roomAttributes,
        include: [{
          as: "sources",
          include: [{
            as: "target",
            attributes: ["name"],
            model: Room
          }],
          model: Link,
          where: {
            hidden: false
          },
          required: false
        }],
        model: Room
      }],
      where: {
        id: user.id
      }
    });

    rooms = userModel?.visitedRooms || [];

    if (userModel && rooms) {
      const linkIds = new Set((await userModel.getVisitedLinks()).map(link => link.id));

      for (const room of rooms) {
        for (const link of room.sources) {
          if (!linkIds.has(link.id)) {
            link.target.name = `${ link.name}??`;
          }
        }
      }
    }
  }

  return rooms.map(room => {
    const links = room.sources.map(source => {
      const link: MinimalLink = {
        n: source.name,
        t: source.target.name
      };

      if (source.hidden) link.h = true;
      if (source.locked) link.l = true;

      return link;
    });

    return {
      l: links,
      n: room.name
    };
  });
}

export interface ChannelInfo {
  d: string;
  n: string;
  s: string;
}

export async function getChannelInfo(roomId: string, userId: string):
Promise<ChannelInfo | undefined> {

  const channel = guild.channels.resolve(roomId);

  if (channel && channel instanceof TextChannel) {
    if (idIsAdmin(userId) || channel.members.has(userId)) {
      const room = await Room.findOne({
        where: {
          id: roomId
        }
      });

      return {
        d: channel.topic || "",
        n: room?.name || "",
        s: channel.parent?.name || ""
      };
    }
  }

  return undefined;
}

export interface UserInfo {
  i: MinimalItem[];
  l: string;
  n: string;
}

export interface UsersAndRooms {
  r: string[];
  u: UserInfo[];
}

export async function getUsersInfo(): Promise<UsersAndRooms> {
  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
  const rooms = (await Room.findAll())
    .map(room => room.name)
    .sort();

  const userInfo =  (await User.findAll())
    .filter(user => !idIsAdmin(user.id))
    .map(user => {
      const inventory = inventoryToJson(user.inventory);
      const member = guild.members.resolve(user.id);

      let location = "";

      if (member) {
        location = currentRoom(member) || "";
      }

      return {
        i: inventory,
        l: location,
        n: user.name
      };
    });

  return {
    r: rooms,
    u: userInfo
  };
}

export interface UserItemChange {
  n?: MinimalItem;
  o?: MinimalItem;
  u: string;
}

function defaultValue<T>(value: T | undefined, ifNot: T): T{
  return value === undefined ? ifNot : value;
}

function sameItem(item: MinimalItem, existing: ItemModel): boolean {
  return item.d === existing.description
    && defaultValue(item.e, false) === defaultValue(existing.editable, false)
    && defaultValue(item.h, false) === defaultValue(existing.hidden, false)
    && defaultValue(item.l, false) === defaultValue(existing.locked, false)
    && defaultValue(item.q, 1) === defaultValue(existing.quantity, 1);
}

export async function handleUserItemChange(data: UserItemChange):
Promise<UserItemChange | string> {

  if (!data.o && !data.n) {
    return "Must provide an old and/or new item";
  }

  const user = await User.findOne({
    where: {
      name: data.u
    }
  });

  if (user) {
    const redlock = await lock({ user: user.id });

    try {
      await user.reload({
        attributes: ["inventory"]
      });

      let existingItem: ItemModel | undefined;

      if (data.o) {
        existingItem = user.inventory[data.o.n];

        if (!existingItem) {
          return `User ${user.name} does not have`;
        } else if (!sameItem(data.o, existingItem)) {
          return `The item ${data.o.n} for ${data.u} has changed`;
        }
      }

      let oldItem: MinimalItem | undefined;
      let newItem: MinimalItem | undefined;

      if (data.n) {
        if (!data.o && data.n.n in user.inventory) {
          return `User ${data.u} already has item ${data.n.n}`;
        } else if (!data.n.n) {
          return "Must provide a name for the new item";
        }

        const changedItem = existingItem || {} as ItemModel;

        changedItem.description  = defaultValue(data.n.d, "");
        changedItem.editable     = defaultValue(data.n.e, false);
        changedItem.hidden       = defaultValue(data.n.h, false);
        changedItem.locked       = defaultValue(data.n.l, false);
        changedItem.name         = data.n.n;
        changedItem.quantity     = defaultValue(data.n.q, 1);

        user.inventory[data.n.n] = changedItem;

        newItem = data.n;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete user.inventory[data.o!.n];

        oldItem = data.o;
      }

      await user.update({
        inventory: user.inventory
      });


      return {
        n: newItem,
        o: oldItem,
        u: data.u
      };
    } finally {
      await unlock(redlock);
    }
  } else {
    return `Could not find ${data.u}`;
  }
}

export interface UserLocationChange {
  n: string;
  o?: string;
  u: string;
}

export async function handleUserLocationChange(data: UserLocationChange):
Promise<UserLocationChange | string> {
  const user = await User.findOne({
    where: {
      name: data.u
    }
  });

  if (user) {
    const redlock = await lock({ user: user.id });

    try {
      const member = guild.members.cache.get(user.id);

      if (!member) {
        return `No member ${user.name} in this guild server`;
      }

      if (data.o && data.o !== "") {
        if (member.roles.cache.size === 0) {
          return `User ${user.name} is no longer in ${data.o}. Please refresh to get recent data`;
        }

        const oldRoom = await getRoomModel(member.roles.cache.first()!.name);

        if (!oldRoom) {
          return `Could not find a room for ${user.name}. Something has gone very wrong`;
        } else if (oldRoom.name !== data.o) {
          return `User ${user.name} is no longer in ${data.o}. Please refresh to get recent data`;
        }
      } else if (member.roles.cache.size > 0) {
        return `User ${user.name} is in a room. You should refresh to get the newest data`;
      }

      const newRoom = await getRoomModel(data.n);

      if (newRoom) {
        await moveMember(member, newRoom.name);
      } else {
        return `Room ${data.n} does not exist`;
      }
    } finally {
      await unlock(redlock);
    }
  } else {
    return `Could not find a user ${data.u}`;
  }

  return {
    n: data.n,
    u: data.u
  };
}
