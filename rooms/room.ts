import * as Discord from 'discord.js';
import { Item } from './item';
import { mainGuild, everyoneRole } from '../helper';
import { ChannelNotFoundError } from '../config/errors';
import { RoomManager } from './roomManager';
import { Room as RoomModel } from '../models/room';

export class Room {
  public actions: { [key: string]: Function }
  public channel: Discord.TextChannel | null = null;
  public description: string;
  public name: string;
  public items: Item[];
  public parent: string;
  public parentChannel: Discord.CategoryChannel | null = null;
  public role: Discord.Role | null = null;
  protected state: object;
  protected manager: RoomManager;

  public constructor({ actions = {}, color = "RANDOM", description, items = [],   name, parent}: { actions?: { [k: string]: Function}, color?: string, 
    description: string, items?: Item[], name: string, parent: string }) 
      {
      
    this.actions = actions;
    this.description = description;
    this.items = items;
    this.name = name;
    this.parent = parent;
    this.state = {};
  }

  public interact(action: string) {
    let split = action.split(" ");
    let command: string = split.shift() || "";
    let args = split.join(" ");

    if (command in this.actions) {
      this.actions[command](args);
    }
  }

  public async init(manager: RoomManager, force: boolean = false,
    allow: Array<Discord.PermissionResolvable> = ["READ_MESSAGES", "SEND_MESSAGES"],
    deny: Array<Discord.PermissionResolvable> = ["READ_MESSAGE_HISTORY", "SEND_MESSAGES"]) {
    
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
            color: "RANDOM"
          });
        }

        if (channel === null) {
          channel = await guild.createChannel(this.name, 'text') as Discord.TextChannel;
        }

        this.channel = channel;
        this.role = role;
        await this.initChannel(allow, deny);
        return;
      }
    }
    
    try {
      this.role = await guild.createRole({
        name: this.name,
        color: "RANDOM"
      });

      this.channel = await guild.createChannel(this.name, 'text') as Discord.TextChannel;

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

export class PublicRoom extends Room {
  public async init(manager: RoomManager, force: boolean = false) {
    super.init(manager, force);
  }
}

export class PrivateRoom extends Room {
  public async init(manager: RoomManager, force: boolean = false) {
    super.init(manager, force, undefined, ["READ_MESSAGES", 
      "READ_MESSAGE_HISTORY", "SEND_MESSAGES"]);
  }
}