import { FunctionResolvable, toFunction } from "../helpers/base";
import { Serializable } from "../helpers/classes";

import { Room } from "./room";

export interface ItemAttributes {
  actions?: { [key: string]: FunctionResolvable };
  children?: ItemAttributes[];
  description: string;
  locked?: boolean;
  name: string;
  quantity?: number;
}

export type ItemResolvable = ItemAttributes | Item;

export interface ItemModel {
  children: ItemModel[];
  description: string;
  locked: boolean;
  name: string;
  quantity: number;
}

export class Item implements Serializable<ItemModel> {
  public actions: { [key: string]: Function } = { };
  public children: Item[] = [];
  public description: string;
  public locked: boolean;
  public name: string;
  public quantity: number;
  public room: Room;
  protected state: object = { };

  public constructor({ actions = { }, children = [], description, locked = false, name,
                       quantity = 1}: ItemAttributes) {

    this.locked = locked;
    this.description = description;
    this.name = name;
    this.quantity = quantity;

    for (const action of Object.keys(actions)) {
      this.actions[action] = toFunction(actions[action], this);
    }

    for (const child of children) {
      if (child instanceof Item) {
        this.children.push(child);
      } else {
        this.children.push(new Item(child));
      }
    }
  }

  public interact(action: string): void {
    const split = action.split(" "),
      command = split.shift(),
      args = split.join(" ");

    if (command !== undefined && command in this.actions) {
      this.actions[command](args);
    } else {
      // console.log("Not a valid command");
    }
  }

  public serialize(): ItemModel {
    return {
      children: this.children.map(c => c.serialize()),
      description: this.description,
      locked: this.locked,
      name: this.name,
      quantity: this.quantity
    };
  }
}
