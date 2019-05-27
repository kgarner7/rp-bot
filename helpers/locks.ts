import async from "async";

import { isNone, None } from "./types";

const roomLock: Set<string> = new Set(),
  userLock: Set<string> = new Set();

const MAX_PARALLEL_LOCKS = 5;

const lockQueue = async.queue(
  ({ release, room, user }: { release: boolean; room?: string; user?: string | string[] },
   callback: (err: None<Error>) => void) => {

  async.until(() => {
    if (release) return true;

    let available = true;

    if (room !== undefined) available = !roomLock.has(room);

    if (user !== undefined) {
      if (user instanceof Array) {
        for (const requestedUser of user) {
          available = available && !userLock.has(requestedUser);
        }
      } else {
        available = available && !userLock.has(user);
      }
    }

    return available;
  },
    () => {
      // do nothing
     }, (err: None<Error>) => {
      if (!isNone(err)) {
        callback(err);

        return;
      }

      const method: "delete" | "add" = release ? "delete" : "add";

      if (room !== undefined) roomLock[method](room);

      if (user !== undefined) {
        if (user instanceof Array) {
          for (const requestedUser of user) {
            userLock[method](requestedUser);
          }
        } else {
          userLock[method](user);
        }
      }

      callback(undefined);
  });
}, MAX_PARALLEL_LOCKS);

let readers = 0;
let hasWriter = false;

const globalReadWriteQueue = async.queue(
  ({ acquire, writer }: { acquire: boolean; writer: boolean},
   callback: () => void) => {

  async.until(() => {
    if (!acquire) {
      return true;
    } else {
      return writer ?
        !hasWriter :
        readers === 1;
    }
  }, () => { /* do nothing*/ }, () => {
    if (writer) {
      hasWriter = hasWriter;
    } else {
      if (acquire) {
        readers++;
      } else {
        readers--;
      }
    }
  });

  callback();
}, MAX_PARALLEL_LOCKS);

/**
 * Requests to acquire or release a lock for a room and/or use
 * @param arg an object
 */
export async function lock({ release, room, user }:
  { release: boolean; room?: string; user?: string | string[] }): Promise<void> {
  return new Promise((resolve: () => void): void => {
    lockQueue.push({ release, room, user },  (err: None<Error>): void => {
      if (!isNone(err)) {
        console.error(err);

        throw err;
      }

      resolve();
    });
  });
}

export async function globalLock({ acquire, writer }:
  { acquire: boolean; writer: boolean}): Promise<void> {

  return new Promise((resolve: () => void): void => {
    globalReadWriteQueue.push({ acquire, writer }, () => {
      resolve();
    });
  });
}
