import moment from "moment";
import socketio, { Server } from "socket.io";

import { guild } from "../client";
import { idIsAdmin, sentToAdmins } from "../helpers/base";
<<<<<<< HEAD
import { lock, unlock } from "../helpers/locks";
=======
import { lock } from "../helpers/locks";
>>>>>>> master
import { isNone } from "../helpers/types";
import { client } from "../models/redis";

import {
  CHANNEL_UPDATE,
  COMMANDS,
  MAPS,
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
  setServer,
  createMap,
  getChannelInfo,
  ChannelInfo
} from "./helpers";

const LOCK_NAME = "socket-disconnect";
const TIME_FORMAT = "Y-MM-DDTHH:mm:ss.SSSSZZ";

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

    sock.on(COMMANDS, async () => {
      const commands = getCommands(idIsAdmin(user.id));
      sock.emit(COMMANDS, commands);
    });

    sock.on(MAPS, async () => {
      const map = await createMap(user);
      sock.emit(MAPS, map);
    });

    sock.on(MESSAGES_GET, async () => {
      const messages = await getMessages(user, sock.request.session.loginTime);
      sock.emit(MESSAGES_GET, messages);
    });

    sock.on(ROOM_INFORMATION, async () => {
      const rooms = await getRooms(user);
      sock.emit(ROOM_INFORMATION, rooms);
    });

    sock.on(ROOM_LOGS, async (roomId: string) => {
      const messages = await getArchivedRoomLogs(roomId, user,
        sock.request.session.loginTime);
      sock.emit(ROOM_LOGS, messages, roomId);
    });

    sock.on(USER_INVENTORY_CHANGE, async () => {
      const redlock = await lock({ user: user.id });

      await user.reload({ attributes: ["inventory" ]});

      await unlock(redlock);

      const json = inventoryToJson(user.inventory);
      sock.emit(USER_INVENTORY_CHANGE, json);
    });

    sock.on(USER_NAME, async () => {
      await user.reload({ attributes: ["discordName"] });
      sock.emit(USER_NAME, {
        a: idIsAdmin(user.id),
        n: user.discordName
      } as UserData);
    });

    sock.on("disconnect", async () => {
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

  const button = io.of("/button");

  button.on("connection", async sock => {
    const user = await getUser(sock);

    if (!user) {
      sock.disconnect();
      return;
    }

    client.hmget("countdown", ["status", "length", "started", user.discordName],
      (err, data) => {
      const status = data[0],
        length = data[1],
        started = data[2],
        // tslint:disable-next-line:no-magic-numbers
        pushed = !isNone(data[3]);

      if (err) {
        sock.emit("err", err.message);
      } else {
        if (data && length && status === "started") {
          const end = moment.utc(data[2])
            .add(length, "milliseconds");

          if (moment.utc() > end) {
            client.hmset("countdown", "status", "done", error => {
              if (error) {
                sock.emit("err", error.message);
              } else {
                sock.emit("time", {
                  length,
                  status: "done"
                });
              }
            });
          } else {
            sock.emit("time", { length, pushed, started, status });
          }
        } else {
          sock.emit("time", { length, pushed, started, status });
        }
      }
    });

    sock.on("set timer", timeInMillis => {
      if (!idIsAdmin(user.id)) {
        sock.emit("err", "Not an admin");
        return;
      }

      const time = parseInt(timeInMillis, 10);

      if (isNaN(time) || time <= 0) {
        sock.emit("err", `"${timeInMillis}" is not a valid number`);
      } else {
        client.hmset("countdown", {
          length: timeInMillis,
          status: "ready"
        }, err => {
          if (err) {
            sock.emit("err", err.message);
          } else {
            button.emit("time", {
              length: timeInMillis,
              status: "ready"
            });
          }
        });
      }
    });

    sock.on("start", () => {
      if (!idIsAdmin(user.id)) {
        sock.emit("err", "Not an admin");
        return;
      }

      const now = moment.utc();

      client.hmget("countdown", "length", (err, data) => {
        const length = parseInt(data[0], 10);

        if (err) {
          sock.emit("err", err.message);
          return;
        }

        client.hmset("countdown", {
          started: now.format(),
          status: "started"
        }, (nestedErr, _resp) => {
            if (nestedErr) {
              sock.emit("err", nestedErr.message);
            } else {
              button.emit("time", {
                length,
                started: now.format(),
                status: "started"
              });
            }
          });
      });
    });

    sock.on("reset", () => {
      if (!idIsAdmin(user.id)) {
        sock.emit("err", "Not an admin");
        return;
      }

      client.hmset("countdown", {
        status: "ready"
      }, (setErr, _res) => {
        if (setErr) {
          sock.emit("err", setErr.message);
          return;
        }

        client.hgetall("countdown", (getErr, result) => {
          if (getErr) {
            sock.emit("err", getErr.message);
            return;
          }

          if (!result || !result.length || !result.status) {
            sock.emit("err", "Could not clear");
            return;
          }

          if (result.status !== "ready") {
            sock.emit("err", "State changed mid set");
            return;
          }

          button.emit("time", {
            length: result.length,
            status: "ready"
          });
        });
      });
    });

    sock.on("clear", () => {
      if (!idIsAdmin(user.id)) {
        sock.emit("err", "Not an admin"); return;
      }

      client.del("countdown");
      button.emit("time", undefined);
    });

    sock.on("submit", data => {
      const now = moment.utc();

      client.hmget("countdown", user.discordName, (err, res) => {
        if (err) {
          sock.emit("err", err.message); return;
        }

        if (res && res.length > 0 && res[0]) {
          sock.emit("submit", "Already submitted");
        } else {
          const submitTime = moment.utc(data, TIME_FORMAT);
          const mesg =  `Local: ${now.format(TIME_FORMAT)}` +
                        `, sent: ${submitTime.format(TIME_FORMAT)}`;

          client.hmset("countdown", user.discordName, mesg, error => {
            if (error) {
              sock.emit("err", error.message);
            } else {
              sock.emit("submit", "OK");

              sentToAdmins(guild, `${user.discordName} pressed at ${mesg}`)
                .catch(error => console.error(error));
            }
          });
        }
      });
    });
  });

  return io;
}
