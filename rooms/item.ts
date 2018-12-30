import { FunctionResolvable, toFunction } from '../helper';
import { Room } from './room';

export type ItemAttributes = {
  actions?: { [key: string]: FunctionResolvable }, 
  children?: ItemAttributes[], 
  description: string, 
  name: string
  quantity?: number;
};

export type ItemResolvable = ItemAttributes | Item;

export class Item {
  public actions: { [key: string]: Function } = {};
  public children: ItemResolvable[] = [];
  public description: string;
  public name: string;
  public quantity: number;
  public room: Room;
  protected state: object = {};
  
  public constructor({actions = {}, children = [], description, name, 
    quantity = 1}: ItemAttributes) {
      
    this.description = description;
    this.name = name;
    this.quantity = quantity;

    for (let action of Object.keys(actions)) {
      this.actions[action] = toFunction(actions[action], this);
    }

    for (let child of children) {
      if (child instanceof Item) {
        this.children.push(child);
      } else {
        this.children.push(new Item(child));
      }
    }
  }

  public interact(action: string) {
    let split = action.split(" "),
      command: string = split.shift() || "",
      args = split.join(" ");

    if (command in this.actions) {
      this.actions[command](args);
    } else {
      console.log("Not a valid command");
    }
  }
}