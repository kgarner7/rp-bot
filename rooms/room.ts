import {
  CategoryChannel,
  ChannelCreationOverwrites,
  PermissionOverwrites,
  PermissionResolvable,
  Role,
  TextChannel
} from "discord.js";

import { ChannelNotFoundError } from "../config/errors";
import {
  Dict,
  everyoneRole,
  FunctionResolvable,
  mainGuild,
  roomManager,
  toFunction
} from "../helpers/base";
import { SerializedMap } from "../helpers/classes";
import { Link, Room as RoomModel, User } from "../models/models";

import { Item, ItemModel, ItemResolvable } from "./item";
import { RoomManager } from "./roomManager";

export interface Neighbor {
  locked: boolean;
  name: string;
  to: string;
  visitors: Set<string>;
}

export interface NeighborResolvable {
  locked?: boolean;
  name: string;
  to: string;
}

export interface RoomAttributes {
  actions?: Dict<FunctionResolvable>;
  color?: string | number;
  description: string;
  isPrivate?: boolean;
  isPublic?: boolean;
  itemsList?: ItemResolvable[];
  name: string;
  neighbors?: NeighborResolvable[];
  parent: string;
}

export type RoomResolvable = RoomAttributes | Room;

export class Room {
  public actions: Map<string, Function> = new Map();
  public channel?: TextChannel;
  public color: string | number;
  public description: string;
  public name: string;
  public isPrivate: boolean = false;
  public isPublic: boolean = false;
  public items: SerializedMap<Item, ItemModel> = new SerializedMap();
  public neighborMap: Map<string, Neighbor> = new Map();
  public parent: string;
  public parentChannel?: CategoryChannel;
  public role?: Role;
  protected state: object = { };
  protected manager: RoomManager;

  public constructor({ actions = { }, color = "RANDOM", description,
                       isPrivate = false, itemsList = [], name, neighbors = [],
                       parent}: RoomAttributes) {

    this.color = color;
    this.description = description;
    this.isPrivate = isPrivate;
    this.name = name;
    this.parent = parent;

    for (const neighbor of neighbors) {
      this.neighborMap.set(neighbor.to, {
        ...{
          locked: false,
          visitors: new Set()
        },
        ...neighbor
      });
    }

    for (const key of Object.keys(actions)) {
      this.actions.set(key, toFunction(actions[key], this));
    }

    for (const i of itemsList) {
      const item: Item = i instanceof Item ? i : new Item(i);
      item.room = this;
      this.items.set(item.name, item);
    }
  }

  public interact(action: string): void {
    const split = action.split(" "),
      shifted: string = split.shift() || "",
      args = split.join(" "),
      fn = this.actions.get(shifted);

    if (fn !== undefined) fn(args);
  }

  public async init(manager: RoomManager, force: boolean = false): Promise<void> {
    if (this.parentChannel === null) return;

    this.manager = manager;

    const existingChannel = await RoomModel.findOne({
      include: [{
        as: "sources",
        include: [{
          as: "target",
          attributes: ["name"],
          model: RoomModel
        }, {
          as: "visitors",
          attributes: ["name"],
          model: User
        }],
        model: Link
      }],
      where: {
        name: this.name
      }
    }),
      guild = mainGuild();

    if (existingChannel !== null) {
      let channel = guild.channels.get(existingChannel.id) as TextChannel,
        role: Role = guild.roles.find(r => r.name === this.name);

      if (force) {
        if (channel !== null) await channel.delete();
        if (role !== null) await role.delete();
        await existingChannel.destroy();
      } else {
        this.items.clear();

        for (const [name, item] of Object.entries(existingChannel.inventory)) {
          this.items.set(name, new Item(item));
        }

        if (role === null) {
          role = await guild.createRole({
            color: this.color,
            name: this.name
          });
        } else {
          role.setColor(this.color);
        }

        if (channel === null) {
          channel = await guild.createChannel(this.name, "text") as TextChannel;
          existingChannel.update({
            id: channel.id
          });
        } else {
          channel.setTopic(this.description);
        }

        this.channel = channel;
        this.role = role;

        return;
      }
    }

    try {
      const role = guild.roles.find(r => r.name === this.name);

      if (role !== null) {
        this.role = role;
        role.setColor(this.color);
      } else {
        this.role = await guild.createRole({
          color: this.color,
          name: this.name
        });
      }

      const channel = guild.channels
        .find(c => c.name === Room.discordChannelName(this.name));

      this.channel = channel !== null && channel instanceof TextChannel ? channel :
        await guild.createChannel(this.name, "text") as TextChannel;

      await RoomModel.create({
        discordName: this.channel.name,
        id: this.channel.id,
        inventory: this.items.serialize(),
        name: this.name
      });
    } catch (err) {
      if (this.role) {
        this.role.delete();
        this.role = undefined;
      }

      if (this.channel) {
        this.channel.delete();
        this.role = undefined;
      }

      guild.owner.send(`Could not create room ${this.name}: ${(err as Error).message}`);
    }
  }

  public initChannel(): void {
    const everyone: string = everyoneRole().id,
      manager = roomManager();

    if (this.channel === undefined ||
        this.role === undefined ||
        this.parentChannel === undefined) return;

    const overwrites: Array<ChannelCreationOverwrites | PermissionOverwrites> = [{
      allow: ["READ_MESSAGES", "SEND_MESSAGES"],
      id: this.role.id
    }, {
      deny: ["READ_MESSAGES", "READ_MESSAGE_HISTORY", "SEND_MESSAGES"],
      id: everyone
    }];

    if (manager.visibility.get(this.parent) !== true &&
      (!this.isPrivate || this.isPublic)) {
      const allowed: PermissionResolvable = ["READ_MESSAGES"];

      if (this.isPublic) allowed.push("SEND_MESSAGES");

      for (const [, channel] of this.parentChannel.children) {
        if (channel.id === this.channel.id) continue;

        for (const room of manager.rooms.values()) {

          if (room.channel!.id === channel.id) {
            overwrites.push({
              allow: allowed,
              id: room.role!.id
            });
          }
        }
      }
    }

    this.channel.replacePermissionOverwrites({
      overwrites
    });

    this.channel.setTopic(this.description);
    this.channel.setParent(this.parentChannel);
  }

  public static async deleteRoom(name: string): Promise<void> {
    const guild = mainGuild(),
      channel = guild.channels.find(c => c.name === name);

    if (channel === null || !(channel instanceof TextChannel) || !channel.deletable) {
      throw new ChannelNotFoundError(name);
    }

    const role = guild.roles
      .get(channel.permissionOverwrites
      .find(p => p.deny === 0).id);

    if (role === undefined) throw new ChannelNotFoundError(name);

    try {
      await channel.delete();
      await role.delete();
      guild.owner.send(`Room ${name} successfully deleted`);
    } catch (err) {
      guild.owner.send(`Could not delete room ${name}: ${((err as Error).message)}`);
    }
  }

  public static discordChannelName(name: string): string {
    return name.toLowerCase()
      .replace(/\ /g, "-")
      .replace(/[^a-zA-z0-9-_]/g, "");
  }
}
