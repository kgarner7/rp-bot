import { writeFile } from "jsonfile";

import { initRooms, initUsers, requireAdmin, roomManager } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";
import { isNone } from "../helpers/types";
import { User, UserResolvable } from "../models/user";
import { ItemAttributes } from "../rooms/item";
import { NeighborResolvable, RoomResolvable } from "../rooms/room";
import { RoomManager } from "../rooms/roomManager";

import { Action } from "./actions";
import { sendMessage } from "./baseHelpers";

export const usage: Action = {
  save: {
    description: "Save the current state of the server to files",
    uses: [{
      admin: true,
      use: "!save"
    }]
  },
  update: {
    description: "Updates the current state from the folder",
    uses: [{
      admin: true,
      use: "!update"
    }]
  }
};

export async function save(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);
  await handleSave();
  sendMessage(msg, "Saved successfully", true);
}

export async function handleSave(): Promise<void> {
  const manager = roomManager();

  for (const [, room] of manager.rooms) {
    const itemsList: ItemAttributes[] = [];

    for (const item of room.items.values()) {
      const itemData: ItemAttributes = {
        description: item.description,
        locked: item.locked,
        name: item.name,
        quantity: item.quantity
      };

      itemsList.push(itemData);
    }

    const neighborsList: NeighborResolvable[] = [];
    const links = manager.links.get(room.name);

    if (!isNone(links)) {
      for (const link of links.values()) {
        const neighborData: NeighborResolvable = {
          hidden: link.hidden,
          locked: link.locked,
          name: link.name,
          to: link.to
        };

        neighborsList.push(neighborData);
      }
    }

    const data: RoomResolvable = {
      color: room.color,
      description: room.description,
      isPrivate: room.isPrivate,
      isPublic: room.isPublic,
      itemsList,
      name: room.name,
      neighbors: neighborsList,
      parent: room.parent
    };

    await writeFile(`./data/rooms/${room.name}.json`, data, { spaces: 2 }, err => {
      if (err) {
        console.error(err);
      }
    });
  }

  const users = await User.findAll();

  for (const user of users) {
    const inventory: ItemAttributes[] = [];

    for (const item of Object.values(user.inventory)) {
      const itemData: ItemAttributes = {
        description: item.description,
        locked: item.locked,
        name: item.name,
        quantity: item.quantity
      };

      inventory.push(itemData);
    }

    const userData: UserResolvable = {
      discordName: user.discordName,
      id: user.id,
      inventory,
      name: user.name
    };

    await writeFile(`./data/users/${user.name}.json`, userData, { spaces: 2 }, err => {
      if (err) {
        console.error(err);
      }
    });
  }
}

export async function update(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);
  await handleUpdate();
  sendMessage(msg, "Updated successfully", true);
}

export async function handleUpdate(): Promise<void> {
  const manager = await RoomManager.create("./data/rooms");
  initRooms(manager);
  await initUsers("./data/users");
}
