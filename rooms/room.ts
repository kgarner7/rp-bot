import {
  CategoryChannel,
  PermissionResolvable,
  Permissions,
  Role,
  TextChannel
} from "discord.js";

import { ChannelNotFoundError } from "../config/errors";
import {
  Dict,
  everyoneRole,
  FunctionResolvable,
  mainGuild,
  toFunction
} from "../helper";
import { Link, Room as RoomModel, User } from "../models/models";

import { Item, ItemResolvable } from "./item";
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
  itemsList?: ItemResolvable[];
  name: string;
  neighbors?: NeighborResolvable[];
  parent: string;
}

export type RoomResolvable = RoomAttributes | Room;

export class Room {
  public actions: Dict<Function> = {};
  public channel?: TextChannel;
  public color: string | number;
  public description: string;
  public name: string;
  public isPrivate: boolean = false;
  public items: Dict<Item> = {};
  public neighborMap: Map<string, Neighbor> = new Map();
  public parent: string;
  public parentChannel?: CategoryChannel;
  public role?: Role;
  protected state: object = {};
  protected manager: RoomManager;

  public constructor({ actions = {}, color = "RANDOM", description,
                       isPrivate = false, itemsList = [], name, neighbors = [],
                       parent}: RoomAttributes) {

    this.color = color;
    this.description = description;
    this.isPrivate = isPrivate;
    this.name = name;
    this.parent = parent;

    for (const neighbor of neighbors) {
      this.neighborMap.set(neighbor.to, {
        ... {
          locked: false,
          visitors: new Set()
        },
        ... neighbor
      });
    }

    for (const key of Object.keys(actions)) {
      this.actions[key] = toFunction(actions[key], this);
    }

    for (const i of itemsList) {
      const item: Item = i instanceof Item ? i : new Item(i);
      item.room = this;
      this.items[item.name] = item;
    }
  }

  public interact(action: string): void {
    const split = action.split(" "),
      command: string = split.shift() || "",
      args = split.join(" ");

    if (command in this.actions) {
      this.actions[command](args);
    }
  }

  public async init(manager: RoomManager, force: boolean = false): Promise<void> {
    const allow: PermissionResolvable[] =
      ["READ_MESSAGES", "SEND_MESSAGES"],
      deny: PermissionResolvable[] =
      ["READ_MESSAGE_HISTORY", "SEND_MESSAGES"];

    if (this.isPrivate) {
      deny.push("READ_MESSAGES");
    }

    if (this.parentChannel === null) {
      return;
    }

    this.manager = manager;

    const existingChannel = await RoomModel.findOne({
      include: [{
        include: [{
          as: "target",
          attributes: ["name"],
          model: RoomModel
        }, {
          as: "visitors",
          attributes: ["name"],
          model: User
        }],
        as: "sources",
        model: Link
      }],
      where: {
        name: this.name
      }
    }),
      guild = mainGuild();

    if (existingChannel) {
      let channel = guild.channels
        .find(c => c.name === (existingChannel as RoomModel).discordName) as TextChannel,
        role: Role = guild.roles.find(r => r.name === this.name);

      if (force) {
        if (channel) { await channel.delete(); }
        if (role) { await role.delete(); }
        await existingChannel.destroy();
      } else {
        if (role === null) {
          role = await guild.createRole({
            name: this.name,
            color: this.color
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
        this.initChannel(allow, deny);

        return;
      }
    }

    try {
      const role = guild.roles.find(r => r.name === this.name);

      if (role) {
        this.role = role;
        role.setColor(this.color);
      } else {
        this.role = await guild.createRole({
          name: this.name,
          color: this.color
        });
      }

      const channel = guild.channels
        .find(c => c.name === Room.discordChannelName(this.name));

      this.channel = channel && channel instanceof TextChannel ? channel:
        await guild.createChannel(this.name, "text") as TextChannel;

      this.initChannel(allow, deny);

      await RoomModel.create({
        discordName: this.channel.name,
        id: this.channel.id,
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

  private initChannel(allow: PermissionResolvable[],
                      deny: PermissionResolvable[]): void {

    const everyone: string = everyoneRole().id;

    if (this.channel === undefined ||
        this.role === undefined ||
        this.parentChannel === undefined) return;

    this.channel.replacePermissionOverwrites({
      overwrites: [{
        allow: allow as Permissions[],
        id: this.role.id
      }, {
        deny: deny as Permissions[],
        id: everyone
      }]
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

    const role: Role = guild.roles
      .find(c => c.id === channel.permissionOverwrites
      .find(p => p.deny === 0).id);

    if (role === null) throw new ChannelNotFoundError(name);

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
