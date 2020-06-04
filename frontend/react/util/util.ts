export enum VisibleStates {
  Commands = "Commands",
  CurrentRooms = "Rooms and items",
  Inventory = "Inventory",
  Requests = "Requests",
  RoomLogs = "View messages",
  Map = "Map",
  ViewUsers = "View users"
}

export const MIN_SIDEBAR_WIDTH = 786;
export const SIDEBAR_WIDTH = 200;

export function calculateWidth({sidebar, width}: {sidebar?: boolean, width: number}): number {
  return width >= MIN_SIDEBAR_WIDTH && sidebar ? width - SIDEBAR_WIDTH: width;
}

export function compareString<T>(a: T, b: T, sign: number): number {
  if (a > b) {
    return sign;
  } else if (a < b) {
    return -sign;
  } else {
    return 0;
  }
}

export function defaultValue<T>(value: T | undefined, ifNot: T): T{
  return value === undefined ? ifNot : value;
}
