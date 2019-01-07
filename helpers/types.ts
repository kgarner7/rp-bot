// tslint:disable:no-any no-unsafe-any
import { Room } from "../models/room";
import { Item, ItemAttributes, ItemResolvable } from "../rooms/item";
import {
  Neighbor,
  NeighborResolvable,
  RoomAttributes,
  RoomResolvable
} from "../rooms/room";

import { Dict, FunctionResolvable } from "./base";

export function exists(arg: any): boolean {
  return arg !== undefined && arg !== null;
}

// START FUNCTION RESOLVABLE

/**
 * Returns whether the argument of FunctionResolvable type
 * @param arg the item to check
 */
export function isFunctionResolvable(arg: any): arg is FunctionResolvable {
  if (arg instanceof Array) {
    for (const item of arg) {
      if (typeof(item) !== "string") return false;
    }

    return true;
  }

  return typeof(arg) === "string" || arg instanceof Function;
}

/**
 * Returns whether the argument is an object mapping strings to FunctionResolvables
 * @param arg the argument to type check
 */
export function isFunctionResolvableDict(arg: any): arg is Dict<FunctionResolvable> {
  if (exists(arg) && typeof(arg) === "object") {
    for (const [key, resolvable] of Object.entries(arg)) {
      if (typeof(key) !== "string") return false;
      if (!isFunctionResolvable(resolvable)) return false;
    }

    return true;
  }

  return false;
}

// END FUNCTION RESOLVABLE; START ITEM

/**
 * Returns whether the argument is of ItemAttributes type
 * @param arg the argument to evaluate
 */
export function isItemAttributes(arg: any): arg is ItemAttributes {
  const baseCheck = exists(arg) &&
    typeof(arg.description) === "string" &&
    typeof(arg.name) === "string" &&
    (exists(arg.quantity) ?
      (typeof(arg.quantity) === "number" && arg.quantity > 0) : true);

  if (!baseCheck) return false;

  if (exists(arg.actions) && !isFunctionResolvableDict(arg.action)) {
    return false;
  }

  if (exists(arg.children)) {
    if (arg.children instanceof Array) {
      for (const item of arg.children) {
        if (!isItemAttributes(item)) return false;
      }
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Returns whether the argument is of ItemResolvable type
 * @param arg the argument to evaluate
 */
export function isItemResolvable(arg: any): arg is ItemResolvable {
  return arg instanceof Item || isItemAttributes(arg);
}

// END ITEM; BEGIN NEIGHBOR

/**
 * Returns whether the argument fulfils the Neighbor type
 * @param arg the argument to evaluate
 */
export function isNeighbor(arg: any): arg is Neighbor {
  const baseCheck = exists(arg) &&
    typeof(arg.locked) === "boolean" &&
    typeof(arg.name) === "string" &&
    typeof(arg.to) === "string";

  if (!baseCheck) return false;

  if (arg.visitors instanceof Set) {
    for (const visitor of arg.visitors) {
      if (typeof(visitor) !== "string") return false;
    }

    return true;
  } else {
    return false;
  }
}

/**
 * Returns whether the argument fulfils the NeighborResolvable type
 * @param arg the argument to evaluate
 */
export function isNeighborResolvable(arg: any): arg is NeighborResolvable {
  return exists(arg) &&
    (exists(arg.locked) ?
      typeof(arg.locked) === "boolean" : true) &&
    (exists(arg.name) && typeof(arg.name) === "string") &&
    (exists(arg.to) && typeof(arg.to) === "string");
}

// END NEIGHBOR; START ROOM

/**
 * Returns whether the argument fulfils RoomAttributes
 * @param arg the argument to evaluate
 */
export function isRoomAttribute(arg: any): arg is RoomAttributes {
  const baseCheck = exists(arg) &&
    (exists(arg.color) ?
      (typeof(arg.color) === "number" || typeof(arg.color) === "string") :
      true) &&
    typeof(arg.description) === "string" &&
    (exists(arg.isPrivate) ?
      typeof(arg.isPrivate) === "boolean" :
      true) &&
    typeof(arg.name) === "string" &&
    typeof(arg.parent) === "string";

  if (!baseCheck) return false;

  if (exists(arg.actions) && !isFunctionResolvableDict(arg.actions)) {
    return false;
  }

  if (exists(arg.itemsList)) {
    if (arg.itemsList instanceof Array) {
      for (const item of arg.itemsList as any[]) {
        if (!isItemResolvable(item)) return false;
      }
    } else {
      return false;
    }
  }

  if (exists(arg.neighbors)) {
    if (arg.neighbors instanceof Array) {
      for (const neighbor of arg.neighbors) {
        if (!isNeighborResolvable(neighbor)) return false;
      }
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Returns whether the specified argument fulfils the RoomResolvable type
 * @param arg the argument to evaluate
 */
export function isRoomResolvable(arg: any): arg is RoomResolvable {
  return arg instanceof Room || isRoomAttribute(arg);
}

// END ROOM
