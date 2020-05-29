import socketio, { Server } from "socket.io";

import { idIsAdmin } from "../helpers/base";
import { lock, unlock } from "../helpers/locks";

import {
  CHANNEL_UPDATE,
  COMMANDS,
  MAPS,
  MESSAGES_GET,
  ROOM_INFORMATION,
  ROOM_LOGS,
  USER_INVENTORY_CHANGE,
  USER_NAME,
  USERS_INFO,
  USER_ITEM_CHANGE,
  USER_LOCATION_CHANGE,
  ROOM_DESCRIPTION,
  ROOM_DELETE,
  ROOM_NAME,
  ROOM_CREATE,
  ROOM_ITEM_CHANGE,
  ROOM_VISIBILITY,
  ROOM_HISTORY,
  LINK_CREATE,
  LINK_DELETE,
  LINK_UPDATE
} from "./consts";
import {
  getArchivedRoomLogs,
  getCommands,
  getMessages,
  getRooms,
  getUser,
  inventoryToJson,
  setServer,
  createMap,
  getChannelInfo,
  ChannelInfo,
  getUsersInfo,
  UserItemChange,
  handleUserItemChange,
  UserLocationChange,
  handleUserLocationChange,
  RoomDescriptionChange,
  handleRoomDescriptionChange,
  handleRoomDelete,
  handleRoomNameChange,
  RoomCreation,
  handleRoomCreation,
  RoomItemChange,
  handleRoomItemChange,
  RoomVisibilityChange,
  handleRoomVisibilityChange,
  RoomHistoryChange,
  handleRoomHistoryChange,
  handleLinkCreation,
  handleLinkDeletion,
  handleLinkChange
} from "./helpers";

export const sockets: Map<string, Set<string>> = new Map();

export interface UserData {
  a: boolean;
  n: string;
}

// tslint:disable-next-line:no-any
export function socket(app: any): Server {
  const io = socketio.listen(app, {
    cookie: false
  });

  setServer(io);

  io.on("connection", async sock => {
    const user = await getUser(sock);

    if (!user) {
      sock.disconnect(true);
      return;
    }

    if (sockets.has(user.id)) {
      sockets.get(user.id)!.add(sock.id);
    } else {
      sockets.set(user.id, new Set([sock.id]));
    }

    sock.on(CHANNEL_UPDATE,
      async (roomId: string, callback: (data: ChannelInfo | undefined) => void) => {

        const data = await getChannelInfo(roomId, user.id);

        callback(data);
      });

    sock.on(CHANNEL_UPDATE,
      async (roomId: string, callback: (data: ChannelInfo | undefined) => void) => {

        const data = await getChannelInfo(roomId, user.id);

        callback(data);
      });

    sock.on(COMMANDS, () => {
      const commands = getCommands(idIsAdmin(user.id));
      sock.emit(COMMANDS, commands);
    });

    sock.on(LINK_CREATE, async (data: any) => {
      if (idIsAdmin(user.id)) {
        const result = await handleLinkCreation(data);
        sock.emit(LINK_CREATE, result);
      }
    });

    sock.on(LINK_DELETE, async (data: any) => {
      if (idIsAdmin(user.id)) {
        const result = await handleLinkDeletion(data);
        sock.emit(LINK_DELETE, result);
      }
    });

    sock.on(LINK_UPDATE, async (data: any) => {
      if (idIsAdmin(user.id)) {
        const result = await handleLinkChange(data);
        sock.emit(LINK_UPDATE, result);
      }
    });

    sock.on(MAPS, async () => {
      const map = await createMap(user);
      sock.emit(MAPS, map);
    });

    sock.on(MESSAGES_GET, async () => {
      const messages = await getMessages(user, sock.request.session.loginTime);
      sock.emit(MESSAGES_GET, messages);
    });

    sock.on(ROOM_CREATE, async (data: RoomCreation) => {
      if (idIsAdmin(user.id)) {
        const result = await handleRoomCreation(data);

        if (typeof result === "string") {
          sock.emit(ROOM_CREATE, result);
        } else {
          io.emit(ROOM_CREATE, result);
        }
      }
    });

    sock.on(ROOM_DELETE, async (roomId: string) => {
      if (idIsAdmin(user.id)) {
        const result = await handleRoomDelete(roomId);

        if (typeof result === "string") {
          sock.emit(ROOM_DELETE, result);
        } else {
          io.emit(ROOM_DELETE, result);
        }
      }
    });

    sock.on(ROOM_DESCRIPTION, async (data: RoomDescriptionChange) => {
      if (idIsAdmin(user.id)) {
        const result = await handleRoomDescriptionChange(data);

        if (typeof result === "string") {
          sock.emit(ROOM_DESCRIPTION, result);
        } else {
          io.emit(ROOM_DESCRIPTION, result);
        }
      }
    });

    sock.on(ROOM_HISTORY, async (data: RoomHistoryChange) => {
      if (idIsAdmin(user.id)) {
        const result = await handleRoomHistoryChange(data);
        sock.emit(ROOM_HISTORY, result);
      }
    });

    sock.on(ROOM_INFORMATION, async () => {
      const rooms = await getRooms(user);
      sock.emit(ROOM_INFORMATION, rooms);
    });

    sock.on(ROOM_ITEM_CHANGE, async (data: RoomItemChange) => {
      if (idIsAdmin(user.id)) {
        const result = await handleRoomItemChange(data);
        sock.emit(ROOM_ITEM_CHANGE, result);
      }
    });

    sock.on(ROOM_LOGS, async (roomId: string) => {
      const messages = await getArchivedRoomLogs(roomId, user,
        sock.request.session.loginTime);
      sock.emit(ROOM_LOGS, messages, roomId);
    });

    sock.on(ROOM_NAME, async (data: RoomDescriptionChange) => {
      if (idIsAdmin(user.id)) {
        const result = await handleRoomNameChange(data);

        if (typeof result === "string") {
          sock.emit(ROOM_NAME, result);
        } else {
          io.emit(ROOM_NAME, result);
        }
      }
    });

    sock.on(ROOM_VISIBILITY, async (data: RoomVisibilityChange) => {
      if (idIsAdmin(user.id)) {
        const result = await handleRoomVisibilityChange(data);
        sock.emit(ROOM_VISIBILITY, result);
      }
    });

    sock.on(USER_INVENTORY_CHANGE, async () => {
      const redlock = await lock({ user: user.id });

      await user.reload({ attributes: ["inventory" ]});

      await unlock(redlock);

      const json = inventoryToJson(user.inventory);
      sock.emit(USER_INVENTORY_CHANGE, json);
    });

    sock.on(USER_LOCATION_CHANGE, async (data: UserLocationChange) => {
      if (idIsAdmin(user.id)) {
        const result = await handleUserLocationChange(data);
        sock.emit(USER_LOCATION_CHANGE, result);
      }
    });

    sock.on(USER_NAME, async () => {
      await user.reload({ attributes: ["discordName"] });
      sock.emit(USER_NAME, {
        a: idIsAdmin(user.id),
        n: user.discordName
      } as UserData);
    });

    sock.on(USERS_INFO, async () => {
      if (idIsAdmin(user.id)) {
        const usersInfo = await getUsersInfo();
        sock.emit(USERS_INFO, usersInfo);
      }
    });

    sock.on(USER_ITEM_CHANGE, async (data: UserItemChange) => {
      if (idIsAdmin(user.id)) {
        const result = await handleUserItemChange(data);

        sock.emit(USER_ITEM_CHANGE, result);
      }
    });

    sock.on("disconnect", () => {
      const userSet = sockets.get(user.id);

      if (userSet) {
        userSet.delete(sock.id);

        if (userSet.size === 0) {
          sockets.delete(user.id);
        } else {
          sockets.set(user.id, userSet);
        }
      }
    });

    sock.on("error", err => {
      console.error(err);
    });
  });

  return io;
}
