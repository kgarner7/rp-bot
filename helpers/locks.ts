import { queue } from "async";

import { isNone, None } from "./types";

const roomLock: Set<string> = new Set(),
  userLock: Set<string> = new Set();

const MAX_PARALLEL_LOCKS = 5;
const CALLBACK_WAIT_TIME = 100;

// tslint:disable-next-line:no-any
function until(test: () => boolean, callback: () => any): void {
  if (test()) {
    callback();
  } else {
    setTimeout(() => until(test, callback), CALLBACK_WAIT_TIME);
  }
}

const lockQueue = queue(
  ({ room, user }: {  room?: string; user?: string | string[] },
   callback: () => void) => {

  until(() => {
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
  }, () => {
      handleRoomLock(false, room, user);
      callback();
  });
}, MAX_PARALLEL_LOCKS);

function handleRoomLock(release: boolean, room?: string, user?: string | string[]): void {
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
}

/**
 * Requests to acquire or release a lock for a room and/or use
 * @param arg an object
 */
export async function lock({ release, room, user }:
  { release: boolean; room?: string; user?: string | string[] }): Promise<void> {

  return new Promise((resolve: () => void): void => {
    if (release) {
      handleRoomLock(true, room, user);
      resolve();
    } else {
      lockQueue.push({ room, user },  (err: None<Error>): void => {
        if (!isNone(err)) {
          console.error(err);
          throw err;
        }

        resolve();
      });
    }
  });
}

let readers = 0;
let hasWriter = false;
let requesterWriters = 0;

const globalReadWriteQueue = queue(({ writer }: { writer: boolean },
                                    callback: () => void) => {
  if (writer) requesterWriters++;

  until(() => {
    if (writer) {
      return readers <= 1 && !hasWriter;
    } else {
      return !hasWriter && requesterWriters === 0;
    }
  }, () => {
    handleGlobalLock(true, writer);
    callback();
  });
}, MAX_PARALLEL_LOCKS);

function handleGlobalLock(acquire: boolean, writer: boolean): void {
  if (writer) {
    hasWriter = acquire;

    if (!acquire) requesterWriters--;
  } else {
    if (acquire) {
      readers++;
    } else {
      readers--;
    }
  }
}

export async function globalLock({ acquire, writer }:
  { acquire: boolean; writer: boolean}): Promise<void> {

  return new Promise((resolve: () => void): void => {
    if (acquire) {
      globalReadWriteQueue.push({ writer }, () => {
        resolve();
      });
    } else {
      handleGlobalLock(false, writer);
      resolve();
    }
  });
}
