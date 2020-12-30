import { Lock } from "redlock";

import { client, locks } from "../models/redis";

const TTL = 3000;

const LOCK_PREFIX = "discordo:";

const Locks = {
  BASE_RANDOM_DELAY: 100,
  BASE_WAIT_TIME: 300,
  PENDING: `${LOCK_PREFIX}waiting-writers`,
  READERS: `${LOCK_PREFIX}readers`,
  ROOMS: `${LOCK_PREFIX}rooms`,
  USERS: `${LOCK_PREFIX}users`,
  WRITER: `${LOCK_PREFIX}writer`
};

export async function resetLocks(): Promise<void> {
  return new Promise((resolve: () => void): void => {
    client.del(
      Locks.PENDING,
      Locks.READERS,
      Locks.ROOMS,
      Locks.USERS,
      Locks.WRITER,
      resolve
    );
  });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
resetLocks();

/**
 * Returns a promise that resolves in BASE_WAIT_TIME + randint(0, BASE_RANDOM_DELAY)
 *  time. Essentially, a random "sleep" with promises
 */
async function randomDelay(): Promise<void> {
  return new Promise((resolve: () => void): void => {
    const delay = Locks.BASE_WAIT_TIME +
      Math.round(Math.random() * Locks.BASE_RANDOM_DELAY);

    setTimeout(resolve, delay);
  });
}

export async function lock({ room, ttl = TTL, user }:
{room?: string; ttl?: number; user?: string | string[] }):
  Promise<Lock> {
  const locksToAcquire: string[] = [];

  if (room) {
    locksToAcquire.push(`${Locks.ROOMS}:${room}`);
  }

  if (user) {
    if (Array.isArray(user)) {
      locksToAcquire.concat(user.map(userId => `${Locks.USERS}:${userId}`));
    } else {
      locksToAcquire.push(`${Locks.USERS}:${user}`);
    }
  }

  let acquiredLock: Lock | undefined;

  do {
    try {
      acquiredLock = await locks.lock(locksToAcquire, ttl);
    } catch (error) {
      console.error(error);
    }
  } while (!acquiredLock);

  return acquiredLock;
}

export async function unlock(redlock: Lock): Promise<void> {
  try {
    await redlock.unlock();
  } catch (error) {
    console.error(error);
  }
}

/**
 * Attempts to acquire a global writer lock. A writer lock is exclusive, preventing
 *  other readers and writers.
 * @returns true if a writer lock was successfully acquired, false otherwise
 */
async function acquireWriter(): Promise<boolean> {
  return new Promise((resolve: (success: boolean) => void): void => {
    client.multi()
      .get(Locks.READERS)
      .setnx(Locks.WRITER, "1")
      .exec((err, res) => {

        if (err) {
          console.error(err);
          resolve(false);
          return;
        }

        const [readers, hasWriter] = res;

        if (hasWriter !== 1) {
          resolve(false);
        } else if (parseInt(readers, 10) > 1) {
          if (hasWriter === 1) {
            client.del(Locks.WRITER, () => resolve(false));
          } else {
            resolve(false);
          }
        } else {
          resolve(true);
        }
      });
  });
}

/**
 * Attempts to acquire a global reader lock. A reader lock can be shared provided there
 *  is not a writer.
 * @returns true if a reader lock was successfully acquired, false otherwise
 */
async function acquireReader(): Promise<boolean> {
  return new Promise((resolve: (success: boolean) => void): void => {
    client.multi()
      .get(Locks.PENDING)
      .get(Locks.WRITER)
      .incr(Locks.READERS)
      .exec((err, res) => {
        if (err) {
          client.decr(Locks.READERS, () => {
            resolve(false);
          });
          return;
        }

        const [pendingWrites, hasWriter] = res;

        if (parseInt(pendingWrites, 10) > 0 || hasWriter) {
          client.decr(Locks.READERS, () => {
            resolve(false);
          });
        } else {
          resolve(true);
        }
      });
  });
}

/**
 * Acquires or releases a global read/write lock.
 * @param args arguments
 *  - acquire (boolean): whether to acquire a lock
 *  - writer (boolean): whether the lock is a reader (shared) or writer (exclusive)
 */
export async function globalLock({ acquire, writer }:
{ acquire: boolean; writer: boolean}): Promise<void> {

  return new Promise(async (resolve: () => void): Promise<void> => {
    if (acquire) {
      if (writer) {
        client.incr(Locks.PENDING, async () => {
          while (true) {
            if (await acquireWriter()) break;
            await randomDelay();
          }

          resolve();
        });
      } else {
        while (true) {
          if (await acquireReader()) break;
          await randomDelay();
        }

        resolve();
      }
    } else {
      if (writer) {
        client.multi()
          .decr(Locks.PENDING)
          .del(Locks.WRITER)
          .exec(resolve);
      } else {
        client.decr(Locks.READERS, resolve);
      }
    }
  });
}
