// tslint:disable:max-classes-per-file
import { DMChannel, GroupDMChannel, GuildMember, TextChannel, User } from "discord.js";

import { Dict } from "./base";
import { isNone } from "./types";

export enum Result {
  LessThan = -1,
  Equal = 0,
  GreaterThan = 1
}

/**
 * Compares two elements: a, b
 * if a < b: returns -1
 * if a = b: returns 0
 * else: returns 1
 */
export type Comparator<T> = (a: T, b: T) => Result;

function compare<T>(a: T, b: T, comparator?: Comparator<T>): Result {
  if (comparator !== undefined) return comparator(a, b);

  const aNone = isNone(a),
    bNone = isNone(b);

  if ((aNone && bNone) || a === b) return Result.Equal;

  if (aNone) return Result.LessThan;

  if (bNone) return Result.GreaterThan;

  if (typeof(a) === "string" && typeof(b) === "string") {
    return a.localeCompare(b, "standard", { sensitivity: "case" });
  }

  return Result[a > b ? "GreaterThan" : "LessThan"];
}

export class SortableArray<T> implements Iterable<T> {
  private readonly values: T[] = [];
  private readonly comparator?: Comparator<T>;

  public constructor(comparator?: Comparator<T>) {
    this.comparator = comparator;
  }

  public add(elem: T): void {
    if (this.values.length === 0) {
      this.values.push(elem);

      return;
    }

    let index = this.binSearch(elem);
    const result = compare(elem, this.values[index], this.comparator);

    if (result > 0) index++;

    this.values.splice(index, 0, elem);
  }

  public addAll(elements: Iterable<T>): void {
    for (const elem of elements) this.add(elem);
  }

  public closest(elem: T): [T, T] {
    const index = this.binSearch(elem),
      value = this.values[index];

    const difference = compare(elem, value, this.comparator);

    if (difference === Result.Equal) {
      return [value, value];
    } else if (difference === Result.LessThan) {
      if (index <= 0) {
        return [value, value];
      } else {
        return [this.values[index - 1], value];
      }
    } else {
      if (index >= this.values.length - 1) {
        return [value, value];
      } else {
        return [value, this.values[index + 1]];
      }
    }
  }

  public has(elem: T): boolean {
    return this.indexOf(elem) !== -1;
  }

  public indexOf(elem: T): number {
    const index = this.binSearch(elem);

    return this.values[index] === elem ? index : -1;
  }

  public join(separator?: string): string {
    return this.values.join(separator);
  }

  public remove(elem: T): T | undefined {
    const index = this.indexOf(elem);

    return index === -1 ? undefined : this.values.splice(index, 1)[0];
  }

  public size(): number {
    return this.values.length;
  }

  public [Symbol.iterator](): Iterator<T> {
    let index = 0;
    const values = this.values;

    return {
      next(): IteratorResult<T> {
        if (index < values.length) {
          return {
            done: false,
            value: values[index++]
          };
        } else {
          return {
            done: true,
            value: values[index]
          };
        }
      },
      return(): IteratorResult<T> {
        index = values.length;

        return {
          done: true,
          value: values[index]
        };
      }
    };
  }

  private binSearch(elem: T): number {
    if (this.values.length === 0) return 0;

    let start = 0,
      end = this.values.length;

    while (start <= end) {
      const mid = Math.floor((start + end) / 2),
        compareRes = compare(elem, this.values[mid], this.comparator);

      switch (compareRes) {
        case Result.LessThan:
          end = mid - 1; break;
        case Result.GreaterThan:
          start = mid + 1; break;
        default:
          return mid;
      }
    }

    const result =  Math.floor((start + end) / 2);

    if (result < 0) {
      return 0;
    } else if (result >= this.values.length) {
      return this.values.length - 1;
    } else {
      return result;
    }
  }
}

export interface Serializable<T> {
  serialize(): T;
}

export class SerializedMap<T extends Serializable<S>, S>
  extends Map<string, T>
  implements Serializable<Dict<S>> {

  public serialize(): Dict<S> {
    const json: Dict<S> = { };

    for (const [key, value] of this.entries()) {
      json[key] = value.serialize();
    }

    return json;
  }
}

export class CustomMessage {
  public author: User;
  public channel: TextChannel | DMChannel | GroupDMChannel;
  public content: string;
  public member: GuildMember;
  public overridenSender?: GuildMember;
}
