import { Room, PublicRoom, PrivateRoom } from '../room';

let room: Room = new PublicRoom({name: "public test", description: "a public room", parent: "test channel"});

export default room;