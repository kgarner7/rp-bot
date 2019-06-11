import socketio, { Server } from "socket.io";

// tslint:disable-next-line:no-any
export function socket(app: any): Server {
  const io = socketio.listen(app);

  return io;
}
