import {
  CategoryChannel,
  ChannelCreationOverwrites,
  PermissionOverwrites,
  PermissionResolvable,
  Role,
  TextChannel
} from "discord.js";

import { everyone, guild } from "../client";
import { ChannelNotFoundError } from "../config/errors";
import {
  Dict,
  FunctionResolvable,
  toFunction,
  sentToAdmins
} from "../helpers/base";
import { SerializedMap } from "../helpers/classes";
import { isNone } from "../helpers/types";
import { Link, Room as RoomModel, User } from "../models/models";

import { Item, ItemModel, ItemResolvable } from "./item";
import { manager, RoomManager } from "./roomManager";

export interface Neighbor {
  hidden: boolean;
  locked: boolean;
  name: string;
  to: string;
  visitors: Set<string>;
}

export interface NeighborResolvable {
  hidden?: boolean;
  locked?: boolean;
  name: string;
  to: string;
}

export interface RoomAttributes {
  actions?: Dict<FunctionResolvable>;
  color?: string | number;
  description: string;
  history?: boolean;
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
  public readonly color: string | number;
  public readonly description: string;
  public readonly name: string;
  public readonly history: boolean;
  public readonly isPrivate: boolean;
  public readonly isPublic: boolean;
  public items: SerializedMap<Item, ItemModel> = new SerializedMap();
  public neighborMap: Map<string, Neighbor> = new Map();
  public parent: string;
  public parentChannel?: CategoryChannel;
  public role?: Role;
  protected state: object = { };
  protected manager: RoomManager;

  public constructor({ actions = { }, color = "RANDOM", description, history = false,
                       isPrivate = false, isPublic = false, itemsList = [], name,
                       neighbors = [], parent}: RoomAttributes) {

    this.color = color;
    this.description = description;
    this.history = history;
    this.isPrivate = isPrivate;
    this.isPublic = isPublic;
    this.name = name;
    this.parent = parent;

    for (const neighbor of neighbors) {
      this.neighborMap.set(neighbor.to, {
        ...{
          hidden: neighbor.hidden || false,
          locked: neighbor.locked || false,
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

  public async init(force = false): Promise<void> {
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
    });

    if (existingChannel !== null) {
      let channel = guild.channels.resolve(existingChannel.id) as TextChannel,
        role = guild.roles.cache.find(r => r.name === this.name);

      if (force) {
        if (channel !== null) await channel.delete();
        if (role) await role.delete();
        await existingChannel.destroy();
      } else {
        if (!role) {
          role = await guild.roles.create({
            data: {
              color: this.color,
              name: this.name
            }
          });
        } else {
          role.setColor(this.color);
        }

        if (isNone(channel)) {
          channel = await guild.channels.create(this.name, {
            topic: this.description,
            type: "text"
          });
          existingChannel.update({
            id: channel.id
          });
        } else {
          channel.setTopic(this.description);
        }

        this.channel = channel;
        this.role = role;

        await RoomModel.update({
          discord: this.channel.name,
          inventory: this.items.serialize(),
          name: this.name
        }, {
          where: {
            id: this.channel.id
          }
        });

        return;
      }
    }

    try {
      const role = guild.roles.cache.find(r => r.name === this.name);

      if (role) {
        this.role = role;
        role.setColor(this.color);
      } else {
        this.role = await guild.roles.create({
          data: {
            color: this.color,
            name: this.name
          }
        });
      }

      const channel = guild.channels.cache
        .find(c => c.name === Room.discordChannelName(this.name));

      this.channel = channel !== null && channel instanceof TextChannel ?
        channel :
        await guild.channels.create(this.name, {
          topic: this.description,
          type: "text"
        });

      await RoomModel.create({
        discordName: this.channel.name,
        id: this.channel.id,
        inventory: this.items.serialize(),
        name: this.name
      });
    } catch (error) {
      if (this.role) {
        this.role.delete();
        this.role = undefined;
      }

      if (this.channel) {
        this.channel.delete();
        this.role = undefined;
      }

      await sentToAdmins(guild, `Could not create room ${this.name}: ${(error as Error).message}`);
    }
  }

  public initChannel(): void {
    if (this.channel === undefined ||
        this.role === undefined ||
        this.parentChannel === undefined) return;

    // const denyPermission: PermissionResolvable = ["READ_MESSAGES", "SEND_MESSAGES"];
    const denyPermission: PermissionResolvable = ["VIEW_CHANNEL", "SEND_MESSAGES"];

    if (!this.history) {
      denyPermission.push("READ_MESSAGE_HISTORY");
    }

    const overwrites: Array<ChannelCreationOverwrites | PermissionOverwrites> = [{
      allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
      id: this.role.id
    }, {
      deny: denyPermission,
      id: everyone
    }];

    const existingRoles = new Set<string>([this.role.id]);

    if (manager.visibility.get(this.parent) !== true &&
      (!this.isPrivate || this.isPublic)) {
      const allowed: PermissionResolvable = ["VIEW_CHANNEL"];

      if (this.isPublic) allowed.push("SEND_MESSAGES");

      for (const [, channel] of this.parentChannel.children) {
        if (channel.id === this.channel.id) continue;

        for (const room of manager.rooms.values()) {

          if (room.channel!.id === channel.id) {
            overwrites.push({
              allow: allowed,
              id: room.role!.id
            });

            existingRoles.add(room.role!.id);
          }
        }
      }
    }

    for (const [, permission] of this.channel.permissionOverwrites) {
      if (permission.type === "member" || !existingRoles.has(permission.id)) {
        overwrites.push(permission);
      }
    }

    this.channel.overwritePermissions(overwrites);

    this.channel.setTopic(this.description);
    this.channel.setParent(this.parentChannel);
  }

  public static async deleteRoom(name: string): Promise<void> {
    const channel = guild.channels.cache.find(c => c.name === name);

    if (channel === null || !(channel instanceof TextChannel) || !channel.deletable) {
      throw new ChannelNotFoundError(name);
    }

    const role = guild.roles
      .resolve(channel.permissionOverwrites
        .find(p => p.deny.bitfield === 0)!.id);

    if (!role) throw new ChannelNotFoundError(name);

    try {
      await channel.delete();
      await role.delete();
      await sentToAdmins(guild, `Room ${name} successfully deleted`);
    } catch (error) {
      await sentToAdmins(guild, `Could not delete room ${name}: ${(error as Error).message}`);
    }
  }

  public static discordChannelName(name: string): string {
    return name.toLowerCase()
      .replace(/\ /g, "-")
      .replace(/[^a-zA-z0-9-_]/g, "");
  }
}
