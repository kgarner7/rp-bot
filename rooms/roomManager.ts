import * as glob from 'glob';
import * as path from 'path';
import { Room } from './room';

export class RoomManager {
  rooms: { [name: string]: Room } = {};

  constructor(rooms: Room[], force: boolean = false) {
    rooms.forEach((room: Room) => {
      this.rooms[room.name as string] = room;
    });

    for (let key in this.rooms) {
      this.rooms[key].init(this, force);
    }
  }

  static async create(directory: string, force: boolean = false) {
    let rooms: Room[] = [];
    for (let file of glob.sync(`${directory}/*.*s`, { absolute: true })) {
      let localPath = `./${path.relative(__dirname, file)}`;
      let mod = await import(localPath);
      rooms.push(mod.default);
    }

    return new RoomManager(rooms, force);
  }
}