import {
  Guild,
  GuildMember,
  Message as DiscordMessage,
  TextChannel,
  User as DiscordUser
} from "discord.js";
import { Op } from "sequelize";
import { Server, Socket } from "socket.io";

import { guild } from "../client";
import { Dict } from "../helpers/base";
import { None } from "../helpers/types";
import { usages } from "../listeners/actions";
import { Link, Message, Room, sequelize, User } from "../models/models";
import { ItemModel } from "../rooms/item";

import { sockets } from "./socket";

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

export async function getRooms(user: GuildMember | User): Promise<object[]> {
  const visibleRooms = new Set<String>();

  for (const [_, channel] of guild.channels) {
    if (channel instanceof TextChannel) {
      if (channel.members.has(user.id)) visibleRooms.add(channel.name);
    }
  }

  let messageRooms: Room[];

  if (user.id === guild.ownerID) {
    messageRooms = await Room.findAll({ attributes: roomAttributes });
  } else {
    const transaction = await sequelize.transaction();

    messageRooms = await Room.findAll({
      attributes: roomAttributes,
      include: [{
        attributes: ["id"],
        include: [{
          attributes: ["id"],
          model: User,
          where: {
            id: user.id
          }
        }],
        model: Message,
        required: true
      }],
      transaction
    });

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
    return roomToJson(room, present, user.id === guild.ownerID);
  });
}

// tslint:disable:no-any
export function roomToJson(room: Room, present: boolean,
                           isAdmin: boolean): Dict<any> {
  const json: Dict<any> = { n: room.name },
    channel = guild.channels.get(room.id) as TextChannel;
  // tslint:enable:no-any

  if (present) {
    json.c = inventoryToJson(room.inventory)
      .filter(item => isAdmin || !item.h);

    json.p = true;
  }

  json.d = channel.topic;
  json.i = channel.id;
  json.n = room.name;
  json.s = channel.parent.name;

  return json;
}

export async function getArchivedRoomLogs(roomId: string, user: User, time: Date):
  Promise<object[]> {

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
    return room.Messages.map(message => ({
      a: message.Sender.discordName,
      d: message.createdAt,
      i: message.id,
      t: message.message
    }));
  } else {
    return [];
  }
}

class MinimalItem {
  public d: string;
  public h?: boolean;
  public l?: boolean;
  public n: string;
  public q?: number;
}

export function itemToJson(item: ItemModel): MinimalItem {
  const itemJson: MinimalItem = {
    d: item.description,
    n: item.name
  };

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

function msgToJson(msg: DiscordMessage): object {
  return {
    a: msg.member.displayName,
    c: msg.channel.id,
    d: msg.editedTimestamp || msg.createdTimestamp,
    i: msg.id,
    t: msg.content
  };
}

export async function getMessages(user: User | GuildMember | DiscordUser,
                                  time: Date): Promise<Dict<object[]>> {

  const messages = await Message.findAll({
    include: [{
      attributes: ["id"],
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

  const response: Dict<object[]> = { };

  for (const message of messages) {
    const messageJson = {
      a: message.Sender.discordName,
      d: message.createdAt,
      i: message.id,
      t: message.message
    }, room = response[message.Room.id];

    if (room) {
      room.push(messageJson);
    } else {
      response[message.Room.id] = [messageJson];
    }
  }

  return response;
}

export function getCommands(isAdmin: boolean): Dict<object> {
  const commands: Dict<object> = { };

  for (const [name, description] of Object.entries(usages)) {
    if (description.adminOnly && !isAdmin) continue;

    // tslint:disable-next-line:no-any
    const command: Dict<any> = { d: description.description, u: [] };

    if (description.adminOnly) command.a = true;

    for (const use of description.uses) {
      if (use.admin && !isAdmin) continue;

      const usage: Dict<boolean | string> = { u: use.use };
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
