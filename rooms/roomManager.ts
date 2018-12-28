import * as glob from 'glob';
import * as path from 'path';
import { Link, Room as RoomModel } from '../models/models';
import { Neighbor, Room, RoomAttributes } from './room';
import { everyoneRole, mainGuild } from '../helper';
import { 
  CategoryChannel, 
  PermissionObject, 
  Role, 
  TextChannel
} from 'discord.js';
import { Op } from 'sequelize';

export class RoomManager {
  public links: Map<string, Set<Neighbor>> = new Map();
  public roles: Set<string> = new Set();
  public rooms: { [name: string]: Room } = {};

  constructor(rooms: Room[], force: boolean = false) {
    rooms.forEach((room: Room) => {
      this.rooms[room.name as string] = room;
    });

    this.initialize(force);
  }

  async initialize(force: boolean) {
    let roomIds: string[] = [];

    for (let key in this.rooms) {
      let room = this.rooms[key];

      await room.init(this, force);
      await this.roles.add((room.role as Role).id);
      roomIds.push((room.channel as TextChannel).id);
    }

    RoomModel.destroy({
      where: {
        id: {
          [Op.not]: roomIds
        }
      }
    });

    let ids: number[] = [];

    for (let key in this.rooms) {
      let source = this.rooms[key];

      if (source.neighbors) {
        for (let neighbor of source.neighbors) {
          let target = this.rooms[neighbor.to];

          if (target) {
            let existing = this.links.get(source.name);
            
            let [link] = await Link.findOrCreate({
              defaults: {
                locked: neighbor.locked
              },
              where: {
                sourceId: (source.channel as TextChannel).id,
                targetId: (target.channel as TextChannel).id
              }
            });

            ids.push(link.id);

            let connection: Neighbor = {
              locked: link.locked,
              to: neighbor.to
            }

            if (existing) {
              existing.add(connection);
            } else {
              this.links.set(source.name, new Set([connection]));
            }
            
          }
        }
        source.neighbors = undefined; 
      }      
    }

    console.log(this.links);

    await Link.destroy({
      where: {
        id: {
          [Op.not]: ids
        }
      }
    })
  }

  static async create(directory: string, force: boolean = false) {
    let rooms: Room[] = [];
    let categories: Map<string, Room[]> = new Map<string, Room[]>();
    let status: Map<string, boolean> = new Map<string, boolean>();

    let everyone = everyoneRole().id;

    for (let file of glob.sync(`${directory}/*.*s`, { absolute: true })) {
      let localPath = `./${path.relative(__dirname, file)}`;
      let mod = await import(localPath);
      let room: Room = mod.default;
      rooms.push(room);

      let existing = categories.get(room.parent);

      if (existing === undefined) {
        categories.set(room.parent, [room]);
        status.set(room.parent, room.isPrivate);
      } else {
        existing.push(room);
        status.set(room.parent, 
          (status.get(room.parent) === true) && room.isPrivate);
      }
    }

    for (let file of glob.sync(`${directory}/*.json`, { absolute: true })) {
      let localPath = `./${path.relative(__dirname, file)}`;
      let json = await import(localPath);
      let room = new Room(json.default as RoomAttributes);
      rooms.push(room);

      let existing = categories.get(room.parent);

      if (existing === undefined) {
        categories.set(room.parent, [room]);
        status.set(room.parent, room.isPrivate);
      } else {
        existing.push(room);
        status.set(room.parent, 
          (status.get(room.parent) === true) && room.isPrivate);
      }
    }

    let guild = mainGuild();

    for (let category of categories.keys()) {
      let existing: CategoryChannel | null = guild.channels
        .find(c => c.name === category && c.type === 'category') as CategoryChannel;

      if (existing !== null && force === true) {
        existing.delete();
        existing = null;
      } 

      if (existing === null) {
        existing = await guild.createChannel(category, 'category', [{
          id: everyone,
          deny: (status.get(category) === true ? ["READ_MESSAGES", "VIEW_CHANNEL"]: [])
        }]) as CategoryChannel;
      } else {
        let overwrites: PermissionObject = {};

        if (status.get(category) === true) {
          overwrites = {
            READ_MESSAGES: false,
            VIEW_CHANNEL: false
          }
        }

        existing.overwritePermissions(everyone, overwrites);
      }

      for (let room of categories.get(category) as Room[]) {
        room.parentChannel = existing;
      }
    }

    return new RoomManager(rooms, force);
  }
}