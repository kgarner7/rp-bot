// tslint:disable:no-implicit-dependencies
// tslint:disable:only-arrow-functions
// tslint:disable:no-invalid-this

import { assert } from "chai";
import { describe, Done, it } from "mocha";

import { globalLock, resetLocks  } from "../helpers/locks";

const SIMULTANEOUS_LOCKS = 100;
const ASYNC_TIMEOUT = 1500;
const SINGLE_LOCK_TIMEOUT = 100;

describe("Locks", function(): void {
  describe("#globalLock({ acquire, writer })", function(): void {
    this.beforeEach(resetLocks);

    this.timeout(ASYNC_TIMEOUT * 2);

    it("should allow multiple reader locks", async function(): Promise<void> {
      for (let count = 0; count < SIMULTANEOUS_LOCKS; count++) {
        await globalLock({ acquire: true, writer: false });
      }
    });

    it("should only allow one writer lock", function(done: Done): void {
      const passed = [],
        promises: Array<Promise<void | number>> = [];

      for (let count = 0; count < SIMULTANEOUS_LOCKS; count++) {
        promises.push(globalLock({ acquire: true, writer: true })
          .then(() => passed.push(count)));
      }

      Promise.race(promises)
        .then(() => {
          assert.equal(passed.length, 1);
          done();
        });
    });

    it("should block writers if there is a pending reader", async function(): Promise<void> {
      const passed: number[] = [];

      await globalLock({ acquire: true, writer: false });

      for (let count = 0; count < SIMULTANEOUS_LOCKS; count++) {
        globalLock({ acquire: true, writer: true })
          .then(() => passed.push(count));
      }

      return new Promise((resolve: () => void): void => {
        setTimeout(function(): void {
          assert.equal(passed.length, 1);
          resolve();
        }, ASYNC_TIMEOUT);
      });
    });

    it("should block further reads if a write is pending", function(done: Done): void {
      const passed = [];

      globalLock({ acquire: true, writer: false })
        .then(function(): void {
          globalLock({ acquire: true, writer: false })
            .then(function(): void {
              globalLock({ acquire: true, writer: true })
                .then(() => done(new Error("Should not be able to acquire writer")));

              setTimeout(function(): void {
                for (let count = 0; count < SIMULTANEOUS_LOCKS; count++) {
                  globalLock({ acquire: true, writer: false })
                    .then(() => passed.push(count));
                }

                setTimeout(function(): void {
                  assert.equal(passed.length, 0);
                  done();
                }, ASYNC_TIMEOUT);
              }, SINGLE_LOCK_TIMEOUT);
           });
        });
    });

    it("should be able to release writer locks", async function(): Promise<void> {
      await globalLock({ acquire: true, writer: true });
      await globalLock({ acquire: false, writer: true });
      await globalLock({ acquire: true, writer: true });
    });

    it("should be able to release reader locks", async function(): Promise<void> {
      await globalLock({ acquire: true, writer: false });
      await globalLock({ acquire: true, writer: false });
      await globalLock({ acquire: false, writer: false });
      await globalLock({ acquire: true, writer: true });
    });
  });
});
