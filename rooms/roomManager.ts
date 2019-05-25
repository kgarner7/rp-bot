import {
  CategoryChannel,
  PermissionObject,
  Role,
  TextChannel
} from "discord.js";
import { sync } from "glob";
import { readFile } from "jsonfile";
import { Op } from "sequelize";

import { everyoneRole, mainGuild } from "../helpers/base";
import { isNone, isRoomAttribute } from "../helpers/types";
import { Link, Room as RoomModel, sequelize, User } from "../models/models";

import { Neighbor, Room } from "./room";

export class RoomManager {
  public links: Map<string, Map<string, Neighbor>> = new Map();
  public roles: Set<string> = new Set();
  public rooms: Map<string, Room> = new Map();
  public visibility: Map<string, boolean> = new Map();

  public constructor(rooms: Room[], force: boolean = false) {
    for (const room of rooms) this.rooms.set(room.name, room);

    this.initialize(force);
  }

  public findPath(start: string, end: string): string[] | null {
    const pathMapping: Map<string, string> = new Map(),
      searched: Set<string> = new Set();
    let nextSearch: Set<string> = new Set(),
      searching: Set<string> = new Set([start]);

    while (searching.size > 0) {
      const item: string = searching.keys()
        .next().value;
      searching.delete(item);

      if (item === end) break;

      searched.add(item);
      const neighbors = this.links.get(item);

      if (neighbors === undefined) continue;

      for (const [target, neighbor] of neighbors.entries()) {
        if (!neighbor.locked && !searched.has(target)) {
          if (!pathMapping.has(target)) pathMapping.set(target, item);

          nextSearch.add(target);
        }
      }

      if (searching.size === 0) {
        searching = nextSearch;
        nextSearch = new Set();
      }
    }

    let location = pathMapping.get(end);

    if (location !== undefined) {
      const route: string[] = [start];

      while (location !== start) {
        route.splice(1, 0, location as string);
        location = pathMapping.get(location as string);
      }

      return route.concat([end]);
    }

    return null;
  }

  public neighbors(id: string, start: string): Set<string> {
    let nextSearch: Set<string> = new Set(),
      searching: Set<string> = new Set([start]);
    const searched: Set<string> = new Set();

    while (searching.size > 0) {
      const item = searching.keys()
          .next().value,
        neighbors = this.links.get(item);
      let skip = false;

      searching.delete(item);

      if (searched.has(item)) skip = true;

      searched.add(item);

      if (!skip && neighbors !== undefined) {
        for (const [, neighbor] of neighbors.entries()) {
          if (neighbor.locked) continue;

          if (!neighbor.visitors.has(id)) continue;

          nextSearch.add(neighbor.to);
        }
      }

      if (searching.size === 0) {
        searching = nextSearch;
        nextSearch = new Set();
      }
    }

    searched.delete(start);

    return searched;
  }

  private async initialize(force: boolean): Promise<void> {
    const roomIds: string[] = [];
    const guild = mainGuild();

    for (const room of this.rooms.values()) {
      await room.init(this, force);
      this.roles.add((room.role as Role).id);
      roomIds.push((room.channel as TextChannel).id);
    }

    for (const room of this.rooms.values()) {
      room.initChannel();
    }

    const transaction = await sequelize.transaction();

    const models = await RoomModel.findAll({
      transaction,
      where: {
        id: {
          [Op.not]: roomIds
        }
      }
    });

    for (const model of models) {
      await model.destroy({ transaction });
      const channel = guild.channels.get(model.id);

      if (!isNone(channel)) await channel.delete();
    }

    await transaction.commit();

    const ids: number[] = [];

    for (const [, source] of this.rooms) {
      for (const [target, neighbor] of source.neighborMap) {
        const targetRoom = this.rooms.get(target);

        if (targetRoom === undefined) {
          continue;
        }

        const [link] = await Link.findOrCreate({
          defaults: {
            hidden: neighbor.hidden,
            locked: neighbor.locked
          },
          where: {
            sourceId: (source.channel as TextChannel).id,
            targetId: (targetRoom.channel as TextChannel).id
          }
        });

        ids.push(link.id);

        const visitors: User[] = await link.getVisitors({
          attributes: ["name"]
        }),
          connection: Neighbor = {
            hidden: link.hidden,
            locked: link.locked,
            name: neighbor.name,
            to: target,
            visitors: new Set(visitors.map((u: User) => u.name))
          },
          existing = this.links.get(source.name);

        if (existing !== undefined) {
          existing.set(target, connection);
        } else {
          this.links.set(source.name, new Map([[target, connection]]));
        }
      }

      source.neighborMap.clear();
    }

    await Link.destroy({
      where: {
        id: {
          [Op.not]: ids
        }
      }
    });
  }

  public static async create(directory: string, force: boolean = false):
                             Promise<RoomManager> {

    const categories: Map<string, Room[]> = new Map(),
      everyone = everyoneRole().id,
      guild = mainGuild(),
      rooms: Room[] = [],
      status: Map<string, boolean> = new Map();

    for (const file of sync(`${directory}/**/*.json`, { absolute: true })) {
      const json = await readFile(file);
      let room: Room;

      // tslint:disable:no-unsafe-any
      if (isRoomAttribute(json)) {
        room = new Room(json);
      } else {
        const error = `Not valid room JSON file ${file}: ${json}`;
        guild.owner.send(error);
        console.error(error);
        continue;
      }
      // tslint:enable:no-unsafe-any

      const existing = categories.get(room.parent);

      rooms.push(room);

      if (existing === undefined) {
        categories.set(room.parent, [room]);
        status.set(room.parent, room.isPrivate);
      } else {
        existing.push(room);
        status.set(room.parent,
          (status.get(room.parent) === true) && room.isPrivate);
      }
    }

    for (const category of categories.keys()) {
      let existing: CategoryChannel | null = guild.channels
        .find(c => c.name === category && c.type === "category") as CategoryChannel;

      if (existing !== null && force) {
        await existing.delete();
        existing = null;
      }

      if (existing === null) {
        existing = await guild.createChannel(category, "category", [{
          deny: (status.get(category) === true ? ["READ_MESSAGES", "VIEW_CHANNEL"] : []),
          id: everyone
        }]) as CategoryChannel;
      } else {
        let overwrites: PermissionObject = { };

        if (status.get(category) === true) {
          overwrites = {
            READ_MESSAGES: false,
            VIEW_CHANNEL: false
          };
        }

        await existing.overwritePermissions(everyone, overwrites);
      }

      for (const room of categories.get(category) as Room[]) {
        room.parentChannel = existing;
      }
    }

    const manager = new RoomManager(rooms, force);
    manager.visibility = status;

    const oldCategories = guild.channels
      .filter(channel => !categories.has(channel.name) &&
        channel instanceof CategoryChannel);

    for (const [, category] of oldCategories) {
      category.delete();
    }

    return manager;
  }
}
