/* eslint-disable @typescript-eslint/unbound-method */
// eslint-disable-next-line import/order
import {enableMapSet, enableES5} from "immer";

enableMapSet();
enableES5();
// eslint-disable-next-line import/order
import loadable from "@loadable/component";
import { sanitize } from "dompurify";
// eslint-disable-next-line no-duplicate-imports
import produce from "immer";
// eslint-disable-next-line import/no-internal-modules
import isEqual from "lodash/isEqual";
import React from "react";
import { Converter } from "showdown";
// eslint-disable-next-line import/no-extraneous-dependencies
import io from "socket.io-client";

import { Dict } from "../../helpers/base";
import {
  CHANNEL_UPDATE,
  MAPS,
  MESSAGES_GET,
  MESSAGE_CREATE,
  MESSAGE_DELETE,
  MESSAGE_UPDATE,
  ROOM_INFORMATION,
  ROOM_LOGS,
  USER_INVENTORY_CHANGE,
  USER_NAME,
  COMMANDS,
  USERS_INFO,
  USER_ITEM_CHANGE,
  USER_LOCATION_CHANGE,
  ROOM_DESCRIPTION,
  ROOM_DELETE,
  ROOM_NAME,
  ROOM_CREATE,
  ROOM_ITEM_CHANGE,
  ROOM_VISIBILITY,
  ROOM_HISTORY,
  LINK_CREATE,
  LINK_DELETE
} from "../../socket/consts";
import {
  MinimalCommand,
  MinimalRoomWithLink,
  MinimalItem,
  MinimalMessageWithChannel,
  MinimalMessageWithoutChannel,
  ChannelWithMinimalMessages,
  RoomJson,
  ChannelInfo,
  UserItemChange,
  UsersAndRooms,
  UserLocationChange,
  RoomDescriptionChange,
  RoomDeleteResult,
  RoomCreation,
  RoomItemChange,
  RoomVisibilityChange,
  RoomHistoryChange,
  LinkCreation,
  LinkDeletion
} from "../../socket/helpers";
import { UserData } from "../../socket/socket";

import { CommandData, CommandUse } from "./command/command";
import { RoomData as CurrentRoomData } from "./currentRoom/currentRoom";
import { MessageData } from "./rooms/room";
import { RoomData as RoomMessagesData } from "./rooms/roomModal";
import Header from "./util/header";
import Sidebar from "./util/sidebar";
import { VisibleStates } from "./util/util";

const Commands = loadable(() =>
  import(/* webpackChunkName: "commands" */ "./command/commands"));

const CurrentRoom = loadable(() =>
  import(/* webpackChunkName: "currentRoom" */ "./currentRoom/currentRoom"));

const Inventory = loadable(() =>
  import(/* webpackChunkName: "inventory" */ "./inventory/inventory"));

const Maps = loadable(() =>
  import(/* webpackChunkName: "maps" */ "./maps/maps"));

const Rooms = loadable(() =>
  import(/* webpackChunkName: "rooms" */ "./rooms/rooms"));

const UsersView = loadable(() =>
  import(/* webpackChunkName: "usersView" */ "./usersView/usersView"));

const USER_OPS = [
  VisibleStates.Inventory,
  VisibleStates.RoomLogs,
  VisibleStates.CurrentRooms,
  VisibleStates.Commands,
  VisibleStates.Map
];
const ADMIN_OPS = [VisibleStates.ViewUsers];

const converter = new Converter();
const startupTasks = [
  USER_NAME,
  USER_INVENTORY_CHANGE,
  MESSAGES_GET
];

function toHtml(content: string): string {
  return sanitize(converter.makeHtml(content));
}

const socket = io();

interface AppState {
  admin: boolean;
  commands: Dict<CommandData>;
  inventory: MinimalItem[];
  roomMessages: Map<string, RoomMessagesData>;
  rooms: Map<string, CurrentRoomData>;
  roomsMap: MinimalRoomWithLink[];
  selected: VisibleStates;
  sidebar: boolean;
  socket: SocketIOClient.Socket;
  username: string;
  users?: UsersAndRooms;
  width: number;
}

export class App extends React.Component<{}, AppState>{
  public constructor(props: {}) {
    super(props);

    this.state = {
      admin: false,
      commands: {},
      inventory: [],
      roomMessages: new Map(),
      rooms: new Map(),
      roomsMap: [],
      selected: VisibleStates.Inventory,
      sidebar: true,
      socket,
      username: "",
      width: document.body.clientWidth
    };

    socket.on(COMMANDS, (data: Dict<MinimalCommand>) => {
      const commands: Dict<CommandData> = { };

      for (const [name, command] of Object.entries(data)) {
        const comm: CommandData = {
          description: command.d,
          uses: []
        };

        if (command.a) comm.admin = true;

        comm.uses = command.u.map(use => {
          const usage: CommandUse = { use: use.u };

          if (use.a) usage.admin = true;
          if (use.e) usage.explanation = use.e;
          if (use.x) usage.example = use.x;

          return usage;
        });

        commands[name] = comm;
      }

      this.setState({ commands });
    });

    socket.on(LINK_CREATE, (data: LinkCreation) => {
      if (typeof data === "string") {
        alert(`Could not create a link: ${data}`);
      } else {
        this.setState(oldState => {
          return produce(oldState, state => {
            for (const link of state.roomsMap) {
              if (link.i === data.f) {
                link.l.push({
                  h: data.o.h,
                  i: data.o.i!,
                  l: data.o.l,
                  n: data.o.n,
                  t: data.o.t!
                });
              } else if (link.i === data.t && data.i) {
                link.l.push({
                  h: data.i.h,
                  i: data.i.i!,
                  l: data.i.l,
                  n: data.i.n,
                  t: data.i.t!
                });
              }
            }
          });
        });
      }
    });

    socket.on(LINK_DELETE, (data: LinkDeletion) => {
      if (typeof data === "string") {
        alert(`Could not delete a link: ${data}`);
      } else {
        this.setState(oldState => {
          return produce(oldState, state => {
            for (const room of state.roomsMap) {
              if (room.i === data.s) {
                room.l = room.l.filter(link => link.i !== data.t);
              }
            }
          });
        });
      }
    });

    socket.on(MAPS, (roomsMap: MinimalRoomWithLink[]) => {
      if (!isEqual(this.state.roomsMap, roomsMap)) {
        this.setState({ roomsMap });
      }
    });

    socket.on(MESSAGE_CREATE, (data: MinimalMessageWithChannel) => {
      this.getChannel(data.c, newChannel => {
        const nextState = produce(this.state, state => {
          const channel = newChannel || state.roomMessages.get(data.c)!;

          channel.messages.push({
            author: data.a,
            content: data.t,
            id: data.i,
            time: new Date(data.d)
          });

          channel.updatedAt = new Date().getTime();

          if (newChannel) {
            state.roomMessages.set(data.c, channel);
          }
        });

        this.setState(nextState);
      });
    });

    socket.on(MESSAGE_DELETE, (data: MinimalMessageWithChannel) => {
      this.getChannel(data.c, newChannel => {
        const nextState = produce(this.state, state => {
          const channel = newChannel || state.roomMessages.get(data.c)!;

          for (let idx = channel.messages.length - 1; idx >= 0; idx--) {
            if (channel.messages[idx].id === data.i) {
              channel.messages.splice(idx, 1);
              channel.updatedAt = new Date().getTime();
              break;
            }
          }

          if (newChannel) {
            state.roomMessages.set(data.c, channel);
          }
        });

        this.setState(nextState);
      });
    });

    socket.on(MESSAGES_GET, (data: Dict<ChannelWithMinimalMessages>) => {
      const nextState = produce(this.state, state => {
        for (const [roomId, roomData] of Object.entries(data)) {
          let updateTime: Date;

          if (roomData.m.length > 0) {
            updateTime = roomData.m[0].d;
          } else {
            updateTime = new Date(0);
          }

          const roomMessages = roomData.m.map(msg => {
            if (msg.d > updateTime) updateTime = msg.d;

            return {
              author: msg.a,
              content: msg.t,
              id: msg.i,
              time: msg.d
            };
          }) as MessageData[];

          const updatedAt = new Date(updateTime).getTime();

          const room: RoomMessagesData = {
            archive: [],
            description: toHtml(roomData.d),
            name: roomData.n,
            messages: roomMessages,
            section: roomData.s,
            updatedAt
          };

          state.roomMessages.set(roomId, room);
        }
      });

      this.setState(nextState);
    });

    socket.on(MESSAGE_UPDATE, (data: MinimalMessageWithChannel) => {
      this.getChannel(data.c, newChannel => {
        const nextState = produce(this.state, state => {
          const channel = newChannel || state.roomMessages.get(data.c)!;

          let idx;

          for (idx = channel.messages.length - 1; idx >= 0; idx--) {
            if (channel.messages[idx].id === data.i) {
              channel.messages[idx].content = data.t;
              channel.updatedAt = new Date().getTime();
              break;
            }
          }

          if (newChannel) {
            state.roomMessages.set(data.c, channel);
          }
        });

        this.setState(nextState);
      });
    });

    socket.on(ROOM_CREATE, (result: RoomCreation) => {
      if (typeof result === "string") {
        alert(`Failed to create room: ${result}`);
      } else {
        this.setState(oldState => {
          return produce(oldState, state => {
            if (result.i) {
              state.rooms.set(result.i, {
                description: result.d,
                history: result.h,
                id: result.i,
                inventory: [],
                name: result.n,
                present: this.state.admin,
                section: result.s,
                updatedAt: new Date().getTime(),
                visibility: result.v!
              });
            }
          });
        });
      }
    });

    socket.on(ROOM_DELETE, (result: RoomDeleteResult) => {
      if (result.e) {
        alert(`Failed to delete room: ${result.e}`);
      } else if (result.r) {
        this.setState(oldState => {
          return produce(oldState, state => {
            state.rooms.delete(result.r!);
            state.roomMessages.delete(result.r!);
          });
        });
      }
    });

    socket.on(ROOM_DESCRIPTION, (result: RoomDescriptionChange) => {
      if (typeof result === "string") {
        alert(`Failed to update description: ${result}`);
      } else {
        this.setState(oldState => {
          return produce(oldState, state => {
            const room = state.rooms.get(result.r);

            if (room) {
              room.description = result.n || "";
            }
          });
        });
      }
    });

    socket.on(ROOM_HISTORY, (result: RoomHistoryChange) => {
      if (typeof result === "string") {
        alert(`Failed to update room history: ${result}`);
      } else {
        this.setState(oldState => {
          return produce(oldState, state => {
            const room = state.rooms.get(result.r);

            if (room) {
              room.history = result.n;
            }
          });
        });
      }
    });

    socket.on(ROOM_INFORMATION, (json: RoomJson[]) => {
      const rooms = new Map<string, CurrentRoomData>();

      for (const room of json) {
        const data = {
          description: room.d,
          history: room.h,
          id: room.i,
          inventory: room.c || [],
          name: room.n,
          present: room.p || false,
          section: room.s || "",
          updatedAt: new Date().getTime(),
          visibility: room.v
        };

        rooms.set(room.i, data);
      }

      if (!isEqual(this.state.rooms, rooms)) {
        this.setState({
          rooms
        });
      }
    });

    socket.on(ROOM_ITEM_CHANGE, (result: string | RoomItemChange) => {
      if (typeof result === "string") {
        alert(`Failed to update item: ${result}`);
      } else {
        this.setState(oldState => {
          return produce(oldState, state => {
            const room = state.rooms.get(result.r);

            if (room) {
              if (result.o) {
                room.inventory = room.inventory.filter(item =>
                  item.n !== result.o!.n);
              } else if (result.n) {
                let found = false;

                for (let index = 0; index < room.inventory.length; index++) {
                  if (room.inventory[index].n === result.n.n) {
                    found = true;
                    room.inventory[index] = result.n;
                    break;
                  }
                }

                if (!found) {
                  room.inventory.push(result.n);
                }
              }
            }
          });
        });
      }
    });

    socket.on(ROOM_LOGS, (messages: MinimalMessageWithoutChannel[], roomId: string) => {
      const nextState = produce(this.state, state => {
        const room = state.roomMessages.get(roomId);

        if (room) {
          if (messages.length > 0) {
            room.archive = messages.map(msg => ({
              author: msg.a,
              content: msg.t,
              id: msg.i,
              time: msg.d
            }));

            const lastUpdate = room.archive[room.archive.length - 1].time;
            room.updatedAt = Math.max(new Date(lastUpdate).getTime(), room.updatedAt || 0);
          }

          room.hasArchive = true;
        }
      });

      this.setState(nextState);
    });

    socket.on(ROOM_NAME, (data: RoomDescriptionChange) => {
      if (typeof data === "string") {
        alert(`Could not change room name: ${data}`);
      } else {
        this.setState(oldState => {
          return produce(oldState, state => {
            const oldItem = state.rooms.get(data.r);

            if (oldItem) {
              oldItem.name = data.n!;
            }

            const oldMessages = state.roomMessages.get(data.r);

            if (oldMessages) {
              oldMessages.name = data.n!;
            }
          });
        });
      }
    });

    socket.on(ROOM_VISIBILITY, (result: RoomVisibilityChange) => {
      if (typeof result === "string") {
        alert(`Failed to update visibility: ${result}`);
      } else {
        this.setState(oldState => {
          return produce(oldState, state => {
            const room = state.rooms.get(result.r);

            if (room) {
              room.visibility = result.n;
            }
          });
        });
      }
    });

    socket.on(USER_INVENTORY_CHANGE, (data: MinimalItem[]) => {
      for (const item of data) {
        item.d = toHtml(item.d);
      }

      if (!isEqual(this.state.inventory, data)) {
        this.setState({ inventory: data });
      }
    });

    socket.on(USER_ITEM_CHANGE, (result: string | UserItemChange) => {
      if (typeof result === "string") {
        alert(`Failed to update item: ${result}`);
      } else {
        this.setState(oldState => {
          const newState = produce(oldState, state => {
            for (const user of state.users?.u || []) {
              if (user.n === result.u) {
                if (result.o) {
                  user.i = user.i.filter(item => item.n !== result.o!.n);
                } else {
                  let found = false;

                  for (let index = 0; index < user.i.length; index++) {
                    if (user.i[index].n === result.n!.n) {
                      found = true;
                      user.i[index] = result.n!;
                      break;
                    }
                  }

                  if (!found) {
                    user.i.push(result.n!);
                  }
                }

                break;
              }
            }
          });

          return newState;
        });
      }
    });

    socket.on(USER_LOCATION_CHANGE, (result: string | UserLocationChange) => {
      if (typeof result === "string") {
        alert(`Failed to update item: ${result}`);
      } else {
        this.setState(oldState => {
          const nextState = produce(oldState, state => {
            for (const user of state.users?.u || []) {
              if (user.n === result.u) {
                user.l = result.n;
                break;
              }
            }
          });

          return nextState;
        });
      }
    });

    socket.on(USER_NAME, (info: UserData) => {
      this.setState({
        admin: info.a,
        username: info.n
      });
    });

    socket.on(USERS_INFO, (users: UsersAndRooms) => {
      if (!isEqual(this.state.users, users)) {
        this.setState({ users });
      }
    });

    for (const task of startupTasks) {
      socket.emit(task);
    }

    window.addEventListener("resize", () => {
      this.setState({width: document.body.clientWidth});
    });

    this.getLogs = this.getLogs.bind(this);
    this.handleToggleMode = this.handleToggleMode.bind(this);
    this.handleToggleSidebar = this.handleToggleSidebar.bind(this);
  }

  public render(): JSX.Element {
    const wrapperClass = `d-flex${  this.state.sidebar ? "": " toggled"}`;

    return(
      <div id="wrapper" className={wrapperClass}>
        <Sidebar
          admin={this.state.admin}
          options={USER_OPS}
          adminOps={ADMIN_OPS}
          handleSelect={this.handleToggleMode}
        />
        <div id="page-content-wrapper">
          <Header
            handleToggle={this.handleToggleSidebar}
            username={this.state.username}
            selected={this.state.selected}
            socket={socket}
          />
          <Inventory
            html
            inventory={this.state.inventory}
            name="inventory"
            selected={ this.state.selected === VisibleStates.Inventory}
            sidebar={this.state.sidebar}
            width={this.state.width}
          />
          <Rooms
            getLogs={this.getLogs}
            rooms={this.state.roomMessages}
            selected={this.state.selected === VisibleStates.RoomLogs}
            sidebar={this.state.sidebar}
            username={this.state.username}
            width={this.state.width}
          />
          <CurrentRoom
            admin={this.state.admin}
            rooms={this.state.rooms}
            selected={this.state.selected === VisibleStates.CurrentRooms}
            sidebar={this.state.sidebar}
            socket={this.state.socket}
            width={this.state.width}
          />
          <Maps
            admin={this.state.admin}
            map={this.state.roomsMap }
            selected={this.state.selected === VisibleStates.Map}
            socket={this.state.socket}
          />
          <Commands
            commands={this.state.commands}
            selected={this.state.selected === VisibleStates.Commands}
          />
          {
            this.state.admin &&
            <UsersView
              selected={this.state.selected === VisibleStates.ViewUsers}
              sidebar={this.state.sidebar}
              socket={this.state.socket}
              users={ this.state.users }
              width={this.state.width}
            />
          }

        </div>
      </div>
    );
  }

  private getLogs(roomId: string): void {
    const room = this.state.roomMessages.get(roomId);

    if (room !== undefined && room.archive.length === 0) {
      this.state.socket.emit(ROOM_LOGS, roomId);
    }
  }

  private handleToggleSidebar(): void {
    this.setState(state => ({
      sidebar: !state.sidebar
    }));
  }

  private handleToggleMode(selected: VisibleStates): void {
    this.setState({ selected });
  }

  private getChannel(roomId: string, callback: (room: RoomMessagesData | undefined) => void): void {
    if (this.state.roomMessages.has(roomId)) {
      callback(undefined);
    } else {
      this.state.socket.emit(CHANNEL_UPDATE, roomId, (data: ChannelInfo | undefined) => {
        if (data) {
          const newChannel: RoomMessagesData = {
            archive: [],
            description: data.d,
            messages: [],
            name: data.n,
            section: data.s
          };

          callback(newChannel);
        }
      });
    }
  }
}

export default App;
