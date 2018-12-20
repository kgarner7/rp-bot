export class Item {
  public actions: { [key: string]: Function };
  public children: Item[];
  public description: string;
  public name: string;
  protected state: object = {};
  
  public constructor(name: string, description: string, 
    actions: { [key: string]: Function} = {}, children: Item[] = []) {
      
    this.actions = actions;
    this.children = children;
    this.description = description;
    this.name = name;
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