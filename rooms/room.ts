import * as Discord from 'discord.js';
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
import { Room as RoomModel } from '../models/room';

export type RoomAttributes = { 
  actions?: Dict<FunctionResolvable>, 
  color?: string | number, 
  description: string, 
  itemsList?: ItemResolvable[], 
  name: string, 
  parent: string,
  isPrivate?: boolean
};

export type RoomResolvable = RoomAttributes | Room;

export class Room {
  public actions: Dict<Function> = {};
  public channel: Discord.TextChannel | null = null;
  public color: string | number;
  public description: string;
  public name: string;
  public items: Dict<Item> = {};
  public parent: string;
  public parentChannel: Discord.CategoryChannel | null = null;
  public isPrivate: boolean = false;
  public role: Discord.Role | null = null;
  protected state: object = {}
  protected manager: RoomManager;

  public constructor({ actions = {}, color = "RANDOM", description, 
    isPrivate = false, itemsList = [], name, parent}: RoomAttributes) 
      {

    this.color = color;
    this.description = description;
    this.isPrivate = isPrivate;
    this.name = name;
    this.parent = parent;

    Object.keys(actions).forEach((key: string) => {
      this.actions[key] = toFunction(actions[key], this);
    });
    
    itemsList.forEach((i: ItemResolvable) => {
      let item: Item = i instanceof Item ? i: new Item(i);
      item.room = this;
      this.items[item.name] = item;
    });
  }

  public interact(action: string) {
    let split = action.split(" ");
    let command: string = split.shift() || "";
    let args = split.join(" ");

    if (command in this.actions) {
      this.actions[command](args);
    }
  }

  public async init(manager: RoomManager, force: boolean = false) {
    let allow: Discord.PermissionResolvable[] = 
      ["READ_MESSAGES", "SEND_MESSAGES"];
    let deny: Discord.PermissionResolvable[] = 
      ["READ_MESSAGE_HISTORY", "SEND_MESSAGES"];

    if (this.isPrivate) {
      deny.push("READ_MESSAGES");
    }
    
    if (this.parentChannel === null) {
      return;
    }

    this.manager = manager;

    let guild = mainGuild();
    let existingChannel = await RoomModel.findOne({
      where: {
        name: this.name
      }
    });

    if (existingChannel) {
      let channel = guild.channels
        .find(c => c.name === (existingChannel as RoomModel).discordName) as Discord.TextChannel;
      let role = guild.roles.find(r => r.name === this.name);

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
          await role.setColor(this.color);
        }

        if (channel === null) {
          channel = await guild.createChannel(this.name, 'text') as Discord.TextChannel;
          await existingChannel.update({
            id: channel.id
          });
        } else {
          await channel.setTopic(this.description);
        }

        this.channel = channel;
        this.role = role;
        await this.initChannel(allow, deny);
        return;
      }
    }
    
    try {
      let role = guild.roles.find(r => r.name === this.name);
      if (role) {
        this.role = role;
        await role.setColor(this.color);
      } else {
        this.role = await guild.createRole({
          name: this.name,
          color: this.color
        });
      }

      let channel = guild.channels.find(c => c.name === Room.discordChannelName(this.name));

      if (channel && channel instanceof Discord.TextChannel) {
        this.channel = channel;
      } else {
        this.channel = await guild.createChannel(this.name, 'text') as Discord.TextChannel;
      }

      await this.initChannel(allow, deny);

      await RoomModel.create({
        discordName: this.channel.name,
        id: this.channel.id,
        name: this.name
      });

      guild.owner.send(`Created room ${this.name}`);
    } catch(err) {
      if (this.role !== null) {
        (this.role as Discord.Role).delete();
        this.role = null;
      }

      if (this.channel !== null) {
        (this.channel as Discord.GuildChannel).delete();
        this.role = null;
      } 
      
      guild.owner.send(`Could not create room ${this.name}: ${(err as Error).message}`)
    }
  }

  private async initChannel(allow: Array<Discord.PermissionResolvable>, 
      deny: Array<Discord.PermissionResolvable>) {
      
      let everyone: string = everyoneRole().id;

      if (this.channel === null || this.role === null || this.parentChannel === null) {
        return;
      }

      await this.channel.replacePermissionOverwrites({
        overwrites: [{
          allow: allow as Discord.Permissions[],
          id: this.role.id
        }, {
          deny: deny as Discord.Permissions[],
          id: everyone
        }]
      });

      await this.channel.setTopic(this.description);
      await this.channel.setParent(this.parentChannel);
  }

  static async deleteRoom(name: string) {
    let guild = mainGuild();
    let channel = guild
      .channels.find(c => c.name === name);

    if (channel === null || !(channel instanceof Discord.TextChannel) || !channel.deletable) {
      throw new ChannelNotFoundError(name);
    } 

    let role: Discord.Role = guild.roles
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