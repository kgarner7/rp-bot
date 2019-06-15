import socketio, { Server } from "socket.io";

import { mainGuild } from "../helpers/base";
import { lock } from "../helpers/locks";

import {
  COMMANDS,
  MESSAGES_GET,
  ROOM_INFORMATION,
  ROOM_LOGS,
  USER_INVENTORY_CHANGE,
  USER_NAME
} from "./consts";
import {
  getArchivedRoomLogs,
  getCommands,
  getMessages,
  getRooms,
  getUser,
  inventoryToJson,
  setServer
} from "./helpers";

const LOCK_NAME = "socket-disconnect";
const sockets: Map<string, Set<string>> = new Map();

export function socketsMap(): Map<string, Set<string>> {
  return sockets;
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

    await lock({ release: false, room: LOCK_NAME });

    if (sockets.has(user.id)) {
      sockets.get(user.id)!.add(sock.id);
    } else {
      sockets.set(user.id, new Set([sock.id]));
    }

    await lock({ release: true, room: LOCK_NAME });

    sock.on(COMMANDS, async () => {
      const commands = getCommands(user.id === mainGuild().ownerID);
      sock.emit(COMMANDS, JSON.stringify(commands));
    });

    sock.on(MESSAGES_GET, async () => {
      const messages = await getMessages(user, sock.request.session.loginTime);
      sock.emit(MESSAGES_GET, JSON.stringify(messages));
    });

    sock.on(ROOM_INFORMATION, async () => {
      const rooms = await getRooms(user);
      sock.emit(ROOM_INFORMATION, JSON.stringify(rooms));
    });

    sock.on(ROOM_LOGS, async (roomId: string) => {
      const messages = await getArchivedRoomLogs(roomId, user,
        sock.request.session.loginTime);
      sock.emit(ROOM_LOGS, JSON.stringify(messages), roomId);
    });

    sock.on(USER_INVENTORY_CHANGE, async () => {
      await lock({ release: false, user: user.id });
      await user.reload({ attributes: ["inventory" ]});
      await lock({ release: true, user: user.id });
      const json = JSON.stringify(inventoryToJson(user.inventory));
      sock.emit(USER_INVENTORY_CHANGE, json);
    });

    sock.on(USER_NAME, async () => {
      await user.reload({ attributes: ["discordName"] });
      sock.emit(USER_NAME, JSON.stringify({
        a: user.id === mainGuild().ownerID,
        n: user.discordName
      }));
    });

    sock.on("disconnect", async () => {
      await lock({ release: false, room: LOCK_NAME });
      const userSet = sockets.get(user.id);

      if (userSet) {
        userSet.delete(sock.id);

        if (userSet.size === 0) {
          sockets.delete(user.id);
        } else {
          sockets.set(user.id, userSet);
        }
      }

      await lock({ release: true, room: LOCK_NAME });
    });

    sock.on("error", err => {
      console.error(err);
    });
  });

  return io;
}
