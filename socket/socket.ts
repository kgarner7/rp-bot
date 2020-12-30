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
  LINK_UPDATE,
  REQUESTS_GET,
  REQUEST_CHANGE,
  REQUEST_CREATE
} from "./consts";
import { getCommands } from "./helpers/commands";
import {
  createMap,
  handleLinkCreation,
  handleLinkDeletion,
  handleLinkChange
} from "./helpers/links";
import { getRequests, handleRequestChange, handleRequestCreation } from "./helpers/requests";
import {
  handleRoomCreation,
  handleRoomDelete,
  handleRoomDescriptionChange,
  handleRoomHistoryChange,
  handleRoomItemChange,
  handleRoomNameChange,
  handleRoomVisibilityChange,
  ChannelInfo,
  getChannelInfo,
  getMessages,
  getRooms,
  getArchivedRoomLogs,
  inventoryToJson
} from "./helpers/rooms";
import {
  setServer,
  getUser,
  handleUserLocationChange,
  UsersAndRooms,
  getUsersInfo,
  handleUserItemChange
} from "./helpers/users";

export const sockets: Map<string, Set<string>> = new Map();

export interface UserData {
  a: boolean;
  n: string;
}

async function stillAlive(sock: SocketIO.Socket): Promise<boolean> {
  const session = sock.request.session as Express.Session | undefined;

  if (!session) {
    sock.disconnect(true);

    return false;
  }

  return new Promise(resolve => {
    session.reload(error => {
      if (error) {
        sock.disconnect(true);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

function handleEvent<I, O>(sock: SocketIO.Socket, event: string,
                           handler: (arg: I) => Promise<O | string>, userId: string,
                           io: Server | undefined = undefined): void {


  let socketHandler: (data: I) => Promise<void>;

  if (io === undefined) {
    socketHandler = async (data): Promise<void> => {
      if (await stillAlive(sock) && idIsAdmin(userId)) {
        try {
          const output = await handler(data);
          sock.emit(event, output);

        } catch (error) {
          console.error(error);
          sock.emit(error, (error as Error).message);
        }
      }
    };
  } else {
    socketHandler = async (data): Promise<void> => {
      if (await stillAlive(sock) && idIsAdmin(userId)) {
        try {
          const output = await handler(data);
          if (typeof output === "string") {
            sock.emit(event, output);
          } else {
            io.emit(event, output);
          }
        } catch (error) {
          console.error(error);
          sock.emit(error, (error as Error).message);
        }
      }
    };
  }

  sock.on(event, socketHandler);
}

function handleCustomEvent<O>(sock: SocketIO.Socket, event: string,
                              handler: () => Promise<O>): void {

  sock.on(event, async () => {
    if (!await stillAlive(sock)) return;

    try {
      const result = await handler();
      sock.emit(event, result);
    } catch (error) {
      console.error((error as Error).message);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function socket(app: any): Server {
  const io = socketio.listen(app, {
    cookie: false
  });

  setServer(io);

  io.on("connection", async sock => {
    if (!await stillAlive(sock)) return;

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
        if (!await stillAlive(sock)) return;

        try {
          const data = await getChannelInfo(roomId, user.id);
          callback(data);
        } catch (error) {
          console.error((error as Error).message);
        }
      });

    sock.on(COMMANDS, () => {
      stillAlive(sock).then(result => {
        if (result) {
          try {
            const commands = getCommands(idIsAdmin(user.id));
            sock.emit(COMMANDS, commands);
          } catch (error) {
            console.error((error as Error).message);
          }
        }
      })
        .catch(console.error);
    });

    handleEvent(sock, LINK_CREATE, handleLinkCreation, user.id);

    handleEvent(sock, LINK_DELETE, handleLinkDeletion, user.id);

    handleEvent(sock, LINK_UPDATE, handleLinkChange, user.id);

    handleCustomEvent(sock, MAPS, () => createMap(user));

    handleCustomEvent(sock, MESSAGES_GET, () => getMessages(user, sock.request.session.loginTime));

    handleEvent(sock, REQUEST_CHANGE, handleRequestChange, user.id);

    sock.on(REQUEST_CREATE, async (data: any) => {
      if (!await stillAlive(sock)) return;

      try {
        const result = await handleRequestCreation(data, user);
        sock.emit(REQUEST_CREATE, result);
      } catch (error) {
        sock.emit(REQUEST_CREATE, (error as Error).message);
      }
    });

    handleCustomEvent(sock, REQUESTS_GET, () => getRequests(user.id));

    handleEvent(sock, ROOM_CREATE, handleRoomCreation, user.id, io);

    handleEvent(sock, ROOM_DELETE, handleRoomDelete, user.id, io);

    handleEvent(sock, ROOM_DESCRIPTION, handleRoomDescriptionChange, user.id, io);

    handleEvent(sock, ROOM_HISTORY, handleRoomHistoryChange, user.id);

    handleCustomEvent(sock, ROOM_INFORMATION, () => getRooms(user));

    handleEvent(sock, ROOM_ITEM_CHANGE, handleRoomItemChange, user.id);

    sock.on(ROOM_LOGS, async (roomId: string) => {
      if (!await stillAlive(sock)) return;

      try {
        const messages = await getArchivedRoomLogs(roomId, user,
          sock.request.session.loginTime);
        sock.emit(ROOM_LOGS, messages, roomId);
      } catch (error) {
        console.error((error as Error).message);
      }
    });

    handleEvent(sock, ROOM_NAME, handleRoomNameChange, user.id, io);

    handleEvent(sock, ROOM_VISIBILITY, handleRoomVisibilityChange, user.id);

    handleCustomEvent(sock, USER_INVENTORY_CHANGE, async () => {
      const redlock = await lock({ user: user.id });

      try {
        await user.reload({ attributes: ["inventory" ]});
      } finally {
        await unlock(redlock);
      }

      return inventoryToJson(user.inventory);
    });

    handleEvent(sock, USER_LOCATION_CHANGE, handleUserLocationChange, user.id);

    handleCustomEvent<UserData>(sock, USER_NAME, async () => {
      await user.reload({ attributes: ["discordName"] });
      return {
        a: idIsAdmin(user.id),
        n: user.discordName
      };
    });

    handleEvent<void, UsersAndRooms>(sock, USERS_INFO, getUsersInfo, user.id);

    handleEvent(sock, USER_ITEM_CHANGE, handleUserItemChange, user.id);

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
