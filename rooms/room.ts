import * as Discord from 'discord.js';
import { Item } from './item';
import { mainGuild } from '../helper';
import { ChannelNotFoundError } from '../config/errors';
import { RoomManager } from './roomManager';

export class Room {
  public actions: { [key: string]: Function }
  public description: string;
  public name: string;
  public items: Item[];
  protected state: object;
  protected manager: RoomManager;

  public constructor(name: string, description: string, items: Item[] = [], actions: { [key: string]: Function} = {}) {
    this.actions = actions;
    this.description = description;
    this.items = items;
    this.name = name;
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
    
    this.manager = manager;

    let guild = mainGuild();
    let existingChannel = guild.channels
      .find(c => c.name === Room.discordChannelName(this.name));
    let existingRole = guild.roles.find(r => r.name === this.name);

    if (existingChannel !== null || existingRole !== null) {
      if (force) {
        if (existingChannel !== null) existingChannel.delete();
        if (existingRole !== null) existingRole.delete();
      } else {
        if (existingChannel) {
          await existingChannel.setTopic(this.description);
        }
        return;
      }
    }
    
    let role: Discord.Role | null = null;
    let channel: Discord.TextChannel | null = null;
    let everyone: string = guild.roles.find(v => v.name === "@everyone").id;

    try {
      role = await guild.createRole({
        name: this.name,
        color: "RANDOM"
      });

      channel = await guild.createChannel(this.name, 'text', [{
        allow: allow as Discord.Permissions[],
        id: role.id
      }, {
        deny: deny as Discord.Permissions[],
        id: everyone
      }]) as Discord.TextChannel;

      await channel.setTopic(this.description);

      guild.owner.send(`Created room ${this.name}`);
    } catch(err) {
      if (role !== null) (role as Discord.Role).delete();
      if (channel !== null) (channel as Discord.Channel).delete();
      
      guild.owner.send(`Could not create room ${this.name}: ${(err as Error).message}`)
    }
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