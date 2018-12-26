import { Room } from '../room';

let customRoom = new Room({
  color: "BLUE",
  description: "this is a somewhat long description", 
  isPrivate: true,
  itemsList: [
    {
      description: "a simple book",
      name: "book"
    }
  ],
  name: "testing", 
  parent: "test channel"
});

export default customRoom;