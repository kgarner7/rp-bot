import socketio, { Server, Socket } from "socket.io";

import { lock } from "./helpers/locks";
import { None } from "./helpers/types";
import { User } from "./models/user";

const sockets: Map<string, Set<string>> = new Map();
const LOCK_NAME = "socket-disconnect";

async function getUser(sock: Socket): Promise<None<User>> {
  if (sock.request.session && sock.request.session.userId) {
    return User.find({
      where: {
        id: sock.request.session.userId
      }
    });
  } else {
    return undefined;
  }
}

// tslint:disable-next-line:no-any
export function socket(app: any): Server {
  const io = socketio.listen(app, {
    cookie: false
  });

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

    sock.on("inventory", async () => {
      await lock({ release: false, user: user.id });
      await user.reload({ attributes: ["inventory" ]});
      sock.emit("inventory", JSON.stringify(user.inventory));
      await lock({ release: true, user: user.id });
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
  });

  return io;
}
