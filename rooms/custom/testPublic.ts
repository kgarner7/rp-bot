import { Room } from '../room';

let room: Room = new Room({
  name: "public test", 
  description: "a public room", 
  parent: "test channel"
});

export default room;