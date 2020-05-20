import { Lock } from "redlock";

import { client, locks } from "../models/redis";

import { isNone, Undefined } from "./types";

const TTS = 3000;

const LOCK_PREFIX = "discordo:";

const Locks = {
  BASE_RANDOM_DELAY: 100,
  BASE_WAIT_TIME: 300,
  PENDING: LOCK_PREFIX + "waiting-writers",
  READERS: LOCK_PREFIX + "readers",
  ROOMS: LOCK_PREFIX + "rooms",
  USERS: LOCK_PREFIX + "users",
  WRITER: LOCK_PREFIX + "writer"
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

resetLocks();

/**
 * Returns a promise that resolves in BASE_WAIT_TIME + randint(0, BASE_RANDOM_DELAY)
 *  time. Essentially, a random "sleep" with promises
 */
function randomDelay(): Promise<void> {
  return new Promise((resolve: () => void): void => {
    const delay = Locks.BASE_WAIT_TIME +
      Math.round(Math.random() * Locks.BASE_RANDOM_DELAY);

    setTimeout(resolve, delay);
  });
}

// /**
//  * Requests to acquire or release a lock for a room and/or use
//  * @param arg an object
//  */
// export async function lock({ release, room, user }:
//   { release: boolean; room?: string; user?: string | string[] }): Promise<void> {

//   const locks = new LockData(room, user);

//   while (true) {
//     const result = release ? await locks.releaseLocks() : await locks.acquireLocks();
//     if (result) return;
//     await randomDelay();
//   }
// }

export async function lock({ room, ttl = TTS, user }: 
                            {room?: string; ttl?: number, user?: string | string[] }): 
                            Promise<Lock> {
  let locksToAcquire: string[] = [];

  if (room) {
    locksToAcquire.push(`lock:room:${room}`)
  }

  if (user) {
    if (user instanceof Array) {
      locksToAcquire.concat(user.map(userId => `lock:user:${userId}`));
    } else {
      locksToAcquire.push(user);
    }
  }

  let acquiredLock: Lock | undefined;

  do {
    try {
      acquiredLock = await locks.lock(locksToAcquire, ttl);
    } catch (error) {
      console.error(acquiredLock);
    }
  } while (!acquiredLock);

  return acquiredLock;
}

export async function unlock(lock: Lock): Promise<void> {
  let released = false;

  do {
    try {
      await lock.unlock();
      released = true;
    } catch (error) {
      console.error(error);
    }
  } while (!released);
}

// export class LockData {
//   public readonly room?: string | undefined;
//   public readonly users: string[] = [];

//   /**
//    * Creates a new lock for an optional room and 0 or more users
//    * @param room an optional room id to lock
//    * @param users an optional user id, or list of user ids
//    */
//   public constructor(room?: string, users?: string | string[]) {
//     this.room = room;

//     if (users) {
//       this.users = users instanceof Array ? users : [users];
//     }
//   }

//   /**
//    * Returns the lock and field name for the index element.
//    * Rooms, if any, come before users. If the index is invalid, returns
//    * undefined.
//    * @param index the index of the lock to find
//    * @returns the lock at index, index, or undefined
//    */
//   public get(index: number): Undefined<[string, string]> {
//     if (index < 0 || index >= this.length()) return undefined;

//     if (this.room) {
//       if (index === 0) {
//         return [Locks.ROOMS, this.room];
//       } else {
//         index--;
//       }
//     }

//     return [Locks.USERS, this.users[index]];
//   }

//   /**
//    * @returns the number of locks attached to this data
//    */
//   public length(): number {
//     return this.users.length + (this.room ? 1 : 0);
//   }

//   /**
//    * Attempts to acquire all the locks atomically. If any of the locks fails,
//    *  returns false and releases partial locks. Otherwise, returns true;
//    * @returns true iff it was successful in acquiring all the locks
//    */
//   public async acquireLocks(): Promise<boolean> {
//     let transaction = await client.multi();

//     for (let idx = 0; idx < this.length(); idx++) {
//       const [key, field] = this.get(idx)!;
//       transaction = transaction.hsetnx(key, field, "1");
//     }

//     return new Promise((resolve: (success: boolean) => void): void => {
//       transaction.exec(async (err, result) => {
//         if (err) {
//           console.error(err);
//           resolve(false); return;
//         }

//         const successes: number[] = [];

//         for (let idx = 0; idx < this.length(); idx++) {
//           if (result[idx] !== 0) {
//             successes.push(idx);
//           }
//         }

//         if (successes.length === this.length()) {
//           resolve(true);
//         } else {
//           while (true) {
//             if (await this.releaseLocks(successes)) return;
//             await randomDelay();
//           }
//         }
//       });
//     });
//   }

//   /**
//    * Attempts to release a set of locks held. If successes is provided, removes
//    *  all locks with the given indices; otherwise, attempts to release all locks.
//    * @param successes an optional list of locks that were successfully acquired
//    * @returns true iff all the locks were successfully removed
//    */
//   public async releaseLocks(successes?: number[]): Promise<boolean> {
//     let transaction = await client.multi();

//     if (successes) {
//       for (const index of successes) {
//         const [key, field] = this.get(index)!;

//         transaction = transaction.hdel(key, field);
//       }
//     } else {
//       for (let idx = 0; idx < this.length(); idx++) {
//         const [key, field] = this.get(idx)!;
//         transaction = transaction.hdel(key, field);
//       }
//     }

//     return new Promise((resolve: (success: boolean) => void): void => {
//       transaction.exec(err => {
//         resolve(isNone(err));
//       });
//     });
//   }
// }

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

/**
 * Attempts to acquire a global writer lock. A writer lock is exclusive, preventing
 *  other readers and writers.
 * @returns true if a writer lock was successfully acquired, false otherwise
 */
function acquireWriter(): Promise<boolean> {
  return new Promise((resolve: (success: boolean) => void): void => {
    client.multi()
      .get(Locks.READERS)
      .setnx(Locks.WRITER, "1")
      .exec((err, res) => {

        if (err) {
          console.error(err);
          resolve(false); return;
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
function acquireReader(): Promise<boolean> {
  return new Promise((resolve: (success: boolean) => void): void => {
    client.multi()
      .get(Locks.PENDING)
      .get(Locks.WRITER)
      .incr(Locks.READERS)
      .exec((err, res) => {
        if (err) {
          resolve(false); return;
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
