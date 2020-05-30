import { ItemModel } from "../../helpers/types";

import { MinimalItem } from "./rooms";

export function defaultValue<T>(value: T | undefined, ifNot: T): T{
  return value === undefined ? ifNot : value;
}

export function isInt(value: any): boolean {
  return !isNaN(value)
    && parseInt(value) == value
    && !isNaN(parseInt(value, 10));
}

export function sameItem(item: MinimalItem, existing: ItemModel): boolean {
  return item.d === existing.description
    && defaultValue(item.e, false) === defaultValue(existing.editable, false)
    && defaultValue(item.h, false) === defaultValue(existing.hidden, false)
    && defaultValue(item.l, false) === defaultValue(existing.locked, false)
    && defaultValue(item.q, 1) === defaultValue(existing.quantity, 1);
}
