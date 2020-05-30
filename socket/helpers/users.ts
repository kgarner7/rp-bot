import { GuildMember, User as DiscordUser } from "discord.js";
import { Server, Socket } from "socket.io";

import { guild } from "../../client";
import { defaultValue } from "../../frontend/react/util/util";
import { idIsAdmin } from "../../helpers/base";
import { lock, unlock } from "../../helpers/locks";
import { ItemModel, None } from "../../helpers/types";
import { currentRoom, getRoomModel } from "../../listeners/baseHelpers";
import { moveMember } from "../../listeners/movement";
import { Room, User } from "../../models/models";
import { sockets } from "../socket";

import { MinimalItem, inventoryToJson } from "./rooms";
import { sameItem, isInt } from "./util";

let serverSocket: Server;

export function setServer(socket: Server): void {
  serverSocket = socket;
}

export async function getUser(sock: Socket): Promise<None<User>> {
  if (sock.request.session && sock.request.session.userId) {
    return User.findOne({
      where: {
        id: sock.request.session.userId
      }
    });
  } else {
    return undefined;
  }
}

export function triggerUser(member: User | GuildMember | DiscordUser,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            event: string, message: any): void {
  const notifiers = sockets.get(member.id);

  if (notifiers) {
    for (const socketId of notifiers) {
      serverSocket.to(socketId)
        .emit(event, message);
    }
  }
}

export interface UserInfo {
  i: MinimalItem[];
  l: string;
  n: string;
}

export interface UsersAndRooms {
  r: string[];
  u: UserInfo[];
}

export async function getUsersInfo(): Promise<UsersAndRooms> {
  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
  const rooms = (await Room.findAll())
    .map(room => room.name)
    .sort();

  const userInfo =  (await User.findAll())
    .map(user => {
      const inventory = inventoryToJson(user.inventory);
      const member = guild.members.resolve(user.id);

      let location = "";

      if (member) {
        location = currentRoom(member) || "";
      }

      return {
        i: inventory,
        l: location,
        n: user.name
      };
    });

  return {
    r: rooms,
    u: userInfo
  };
}

export interface UserItemChange {
  n?: MinimalItem;
  o?: MinimalItem;
  u: string;
}

export async function handleUserItemChange(data: UserItemChange):
Promise<UserItemChange | string> {

  if (!data.o && !data.n) {
    return "Must provide an old and/or new item";
  }

  const user = await User.findOne({
    where: {
      name: data.u
    }
  });

  if (user) {
    const redlock = await lock({ user: user.id });

    try {
      await user.reload({
        attributes: ["inventory"]
      });

      let existingItem: ItemModel | undefined;

      if (data.o) {
        existingItem = user.inventory[data.o.n];

        if (!existingItem) {
          return `User ${user.name} does not have`;
        } else if (!sameItem(data.o, existingItem)) {
          return `The item ${data.o.n} for ${data.u} has changed`;
        }
      }

      let oldItem: MinimalItem | undefined;
      let newItem: MinimalItem | undefined;

      if (data.n) {
        if (!data.o && data.n.n in user.inventory) {
          return `User ${data.u} already has item ${data.n.n}`;
        } else if (!data.n.n) {
          return "Must provide a name for the new item";
        }

        const changedItem = existingItem || {} as ItemModel;

        changedItem.description  = defaultValue(data.n.d, "");
        changedItem.editable     = defaultValue(data.n.e, false);
        changedItem.hidden       = defaultValue(data.n.h, false);
        changedItem.locked       = defaultValue(data.n.l, false);
        changedItem.name         = data.n.n;

        const quantity = defaultValue(data.n.q, 1);

        if (!isInt(quantity) || quantity < 1) {
          return "Must provide integer quantity greater than 0";
        } else {
          changedItem.quantity = quantity;
        }

        user.inventory[data.n.n] = changedItem;

        newItem = data.n;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete user.inventory[data.o!.n];

        oldItem = data.o;
      }

      await user.update({
        inventory: user.inventory
      });

      return {
        n: newItem,
        o: oldItem,
        u: data.u
      };
    } finally {
      await unlock(redlock);
    }
  } else {
    return `Could not find ${data.u}`;
  }
}

export interface UserLocationChange {
  n: string;
  o?: string;
  u: string;
}

export async function handleUserLocationChange(data: UserLocationChange):
Promise<UserLocationChange | string> {
  const user = await User.findOne({
    where: {
      name: data.u
    }
  });

  if (user) {
    const redlock = await lock({ user: user.id });

    try {
      const member = guild.members.cache.get(user.id);

      if (!member) {
        return `No member ${user.name} in this guild server`;
      }

      if (data.o && data.o !== "") {
        if (member.roles.cache.size === 0) {
          return `User ${user.name} is no longer in ${data.o}. Please refresh to get recent data`;
        }

        const oldRoom = await getRoomModel(member.roles.cache.first()!.name);

        if (!oldRoom) {
          return `Could not find a room for ${user.name}. Something has gone very wrong`;
        } else if (oldRoom.name !== data.o) {
          return `User ${user.name} is no longer in ${data.o}. Please refresh to get recent data`;
        }
      } else if (member.roles.cache.size > 1) {
        return `User ${user.name} is in a room. You should refresh to get the newest data`;
      }

      const newRoom = await getRoomModel(data.n);

      if (newRoom) {
        await moveMember(member, newRoom.name);
      } else {
        return `Room ${data.n} does not exist`;
      }
    } catch (error) {
      console.error(error);
    } finally {
      await unlock(redlock);
    }
  } else {
    return `Could not find a user ${data.u}`;
  }

  return {
    n: data.n,
    u: data.u
  };
}
