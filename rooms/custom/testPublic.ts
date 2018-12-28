import { Room } from '../room';

let room: Room = new Room({
  name: "public test", 
  description: "a public room", 
  neighbors: [],
  parent: "test channel"
});

export default room;