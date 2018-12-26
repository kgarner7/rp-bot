import { FunctionResolvable, toFunction } from '../helper';
import { Room } from './room';

export type ItemAttributes = {
  actions?: { [key: string]: FunctionResolvable }, 
  children?: ItemAttributes[], 
  description: string, 
  name: string
};

export type ItemResolvable = ItemAttributes | Item;

export class Item {
  public actions: { [key: string]: Function } = {};
  public children: ItemResolvable[] = [];
  public description: string;
  public name: string;
  public room: Room;
  protected state: object = {};
  
  public constructor({actions = {}, children = [], description, name}: ItemAttributes
    )
    {
      
    this.description = description;
    this.name = name;

    Object.keys(actions).forEach((action: string) => {
      this.actions[action] = toFunction(actions[action], this);
    
    });

    children.forEach((c: ItemResolvable) => {
      if (c instanceof Item) {
        this.children.push(c);
      } else {
        this.children.push(new Item(c));
      }
    });
  }

  public interact(action: string) {
    let split = action.split(" ");
    let command: string = split.shift() || "";
    let args = split.join(" ");

    if (command in this.actions) {
      this.actions[command](args);
    } else {
      console.log("Not a valid command");
    }
  }
}