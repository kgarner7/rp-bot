export enum VisibleStates {
  Commands = "Commands",
  CurrentRooms = "Rooms and items",
  Inventory = "Inventory",
  Requests = "Requests",
  RoomLogs = "View messages",
  Map = "Map",
  ViewUsers = "View users"
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
