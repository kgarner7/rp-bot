import {
  CategoryChannel,
  Permissions,
  PermissionResolvable,
  Message as DiscordMessage,
  Role,
  TextChannel,
} from 'discord.js';
import { Item, ItemResolvable } from './item';
import { 
  everyoneRole,
  mainGuild, 
  toFunction, 
  Dict, 
  FunctionResolvable
} from '../helper';
import { ChannelNotFoundError } from '../config/errors';
import { RoomManager } from './roomManager';
import { Room as RoomModel, User } from '../models/models';

export type Neighbor = {
  locked: boolean;
  name: string;
  to: string;
};

export type NeighborResolvable = {
  locked?: boolean;
  name: string;
  to: string;
}

export type RoomAttributes = { 
  actions?: Dict<FunctionResolvable>, 
  color?: string | number, 
  description: string, 
  isPrivate?: boolean,
  itemsList?: ItemResolvable[], 
  name: string, 
  neighbors?: NeighborResolvable[];
  parent: string
};

export type RoomResolvable = RoomAttributes | Room;

export class Room {
  public actions: Dict<Function> = {};
  public channel?: TextChannel;
  public color: string | number;
  public description: string;
  public name: string;
  public isPrivate: boolean = false;
  public items: Dict<Item> = {};
  public neighbors?: Neighbor[];
  public parent: string;
  public parentChannel?: CategoryChannel;
  public role?: Role;
  public visitors: Set<string> = new Set();
  protected state: object = {};
  protected manager: RoomManager;

  public constructor({ actions = {}, color = "RANDOM", description, 
    isPrivate = false, itemsList = [], name, neighbors = [], parent}: RoomAttributes) 
    {

    this.color = color;
    this.description = description;
    this.isPrivate = isPrivate;
    this.name = name;
    this.neighbors = neighbors.map((neighbor: NeighborResolvable) => {
      return {
        locked: neighbor.locked === true,
        name: neighbor.name,
        to: neighbor.to
      }
    });
    this.parent = parent;

    for (let key of Object.keys(actions)) {
      this.actions[key] = toFunction(actions[key], this);
    }

    for (let i of itemsList) {
      let item: Item = i instanceof Item ? i: new Item(i);
      item.room = this;
      this.items[item.name] = item;
    }    
  }

  public interact(action: string) {
    let split = action.split(" "),
      command: string = split.shift() || "",
      args = split.join(" ");

    if (command in this.actions) {
      this.actions[command](args);
    }
  }

  public async init(manager: RoomManager, force: boolean = false) {
    let allow: PermissionResolvable[] = 
      ["READ_MESSAGES", "SEND_MESSAGES"],
      deny: PermissionResolvable[] = 
      ["READ_MESSAGE_HISTORY", "SEND_MESSAGES"];

    if (this.isPrivate) deny.push("READ_MESSAGES");
    
    
    if (this.parentChannel === null) return;
    
    this.manager = manager;
     
    let existingChannel = await RoomModel.findOne({
      where: {
        name: this.name
      }
    }), 
      guild = mainGuild();;

    if (existingChannel) {
      let channel = guild.channels
        .find(c => c.name === (existingChannel as RoomModel).discordName) as TextChannel,
        role = guild.roles.find(r => r.name === this.name);

      if (force) {
        if (channel) await channel.delete();
        if (role) await role.delete();
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
          channel = await guild.createChannel(this.name, 'text') as TextChannel;
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
      let role = guild.roles.find(r => r.name === this.name);
      
      if (role) {
        this.role = role;
        role.setColor(this.color);
      } else {
        this.role = await guild.createRole({
          name: this.name,
          color: this.color
        });
      }

      let channel = guild.channels.find(c => c.name === Room.discordChannelName(this.name));

      if (channel && channel instanceof TextChannel) {
        this.channel = channel;
      } else {
        this.channel = await guild.createChannel(this.name, 'text') as TextChannel;
      }

      this.initChannel(allow, deny);

      await RoomModel.create({
        discordName: this.channel.name,
        id: this.channel.id,
        name: this.name
      });
    } catch(err) {
      if (this.role) {
        this.role.delete();
        this.role = undefined;
      }

      if (this.channel) {
        this.channel.delete();
        this.role = undefined;
      } 
      
      guild.owner.send(`Could not create room ${this.name}: ${(err as Error).message}`)
    }
  }

  private initChannel(allow: PermissionResolvable[], 
      deny: PermissionResolvable[]) {
      
      let everyone: string = everyoneRole().id;

      if (this.channel === undefined || this.role === undefined || this.parentChannel === undefined) {
        return;
      }

      User.findAll({
        attributes: ["id"],
        include: [{
          as: "visitedRooms",
          model: RoomModel,
          where: {
            id: this.channel.id
          }
        }]
      }).then((users: User[]) => {
        this.visitors = new Set<string>(users
          .map((user: User) => {
            return user.id;
          }));
      });

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

  static async deleteRoom(name: string) {
    let guild = mainGuild();
    let channel = guild
      .channels.find(c => c.name === name);

    if (channel === null || !(channel instanceof TextChannel) || !channel.deletable) {
      throw new ChannelNotFoundError(name);
    } 

    let role: Role = guild.roles
      .find(c => c.id === channel.permissionOverwrites
      .find(p => p.deny === 0).id);

    if (role === null) throw new ChannelNotFoundError(name);

    try {
      await channel.delete();
      await role.delete();
      guild.owner.send(`Room ${name} successfully deleted`);
    } catch(err) {
      guild.owner.send(`Could not delete room ${name}: ${((err as Error).message)}`);
    }
  }

  static discordChannelName(name: string) {
    return name.toLowerCase().replace(/\ /g, '-')
      .replace(/[^a-zA-z0-9-_]/g, "");
  }
}