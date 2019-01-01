import { FunctionResolvable, toFunction } from "../helpers/base";

import { Room } from "./room";

export interface ItemAttributes {
  actions?: { [key: string]: FunctionResolvable };
  children?: ItemAttributes[];
  description: string;
  name: string;
  quantity?: number;
}

export type ItemResolvable = ItemAttributes | Item;

export class Item {
  public actions: { [key: string]: Function } = { };
  public children: ItemResolvable[] = [];
  public description: string;
  public name: string;
  public quantity: number;
  public room: Room;
  protected state: object = { };

  public constructor({ actions = { }, children = [], description, name,
                       quantity = 1}: ItemAttributes) {

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
}
