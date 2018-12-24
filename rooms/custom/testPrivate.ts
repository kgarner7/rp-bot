import { PrivateRoom } from '../room';
import { Item } from '../item';

let items: Item[] = [
  new Item({name: "book", description: "a simple book"}),
];

let customRoom = new PrivateRoom({
  description: "description", 
  items: items,
  name: "testing", 
  parent: "test channel"
});

export default customRoom;