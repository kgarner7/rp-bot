import {enableMapSet} from "immer"

enableMapSet()

import produce from "immer"

import { sanitize } from "dompurify";
import React from "react";
import { Converter } from "showdown";
import io from "socket.io-client";

import Sidebar from "./sidebar";
import Header from "./header";
import Inventory from "./inventory";
import Rooms, { RoomMessagesData, MessageData } from "./rooms";
import CurrentRoom, { RoomData } from "./currentRoom";
import Commands, { CommandData, CommandUse } from "./commands";
import Maps from "./maps";
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
  COMMANDS
} from "../../socket/consts";
import { Dict } from "../../helpers/base";
import { MinimalCommand, MinimalRoomWithLink, MinimalItem, MinimalMessageWithChannel, MinimalMessageWithoutChannel, ChannelWithMinimalMessages, RoomJson, ChannelInfo } from "../../socket/helpers";
import { UserData } from "../../socket/socket";

export enum VisibleStates {
  Commands = "Commands",
  CurrentRooms = "Current room(s)",
  Inventory = "Inventory",
  RoomLogs = "Rooms",
  Map = "Map",
  ViewUsers = "View users"
}

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
  ROOM_INFORMATION, 
  MESSAGES_GET, 
  COMMANDS
];

function toHtml(content: string) {
  return sanitize(converter.makeHtml(content));
}

const socket = io();

interface AppState {
  admin: boolean;
  commands: Dict<CommandData>;
  inventory: MinimalItem[];
  roomMessages: Map<string, RoomMessagesData>;
  rooms: Map<string, RoomData>;
  roomsMap: MinimalRoomWithLink[];
  selected: VisibleStates;
  sidebar: boolean;
  socket: SocketIOClient.Socket;
  username: string;
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

    socket.on(MAPS, (data: MinimalRoomWithLink[]) => {
      this.setState({
        roomsMap: data
      });
    });

    socket.on(USER_INVENTORY_CHANGE, (data: MinimalItem[]) => { 
      for (const item of data) {
        item.d = toHtml(item.d);
      }

      this.setState({ inventory: data });
    });

    socket.on(ROOM_INFORMATION, (json: RoomJson[]) => {
      const rooms = new Map();

      for (const room of json) {
        const data: RoomData = {
          inventory: room.c || [],
          name: room.n,
          present: room.p || false,
          updatedAt: new Date().getTime()
        }

        rooms.set(room.i, data);
      }

      this.setState({ rooms });
    });

    socket.on(ROOM_LOGS, (messages: MinimalMessageWithoutChannel[], roomId: string) => {
      const nextState = produce(this.state, state => {
        const room = state.roomMessages.get(roomId);

        if (room !== undefined) {
          if (messages.length > 0) {
            room.archive = messages.map(msg => ({      
              author: msg.a,
              content: msg.t,
              id: msg.i,
              time: msg.d
            }));

            const lastUpdate = room.archive[room.archive.length - 1].time;
            room.updatedAt = Math.max(new Date(lastUpdate).getTime(), room.updatedAt || 0);
            room.hasArchive = true;

            state.roomMessages.set(roomId, room);
          } 
        }
      });

      this.setState(nextState);
    });

    socket.on(MESSAGES_GET, (data: Dict<ChannelWithMinimalMessages>) => {
      const nextState = produce(this.state, state => {
        for (const [roomId, roomData] of Object.entries(data)) {
          let updateTime = roomData.m[0].d;

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

    socket.on(MESSAGE_CREATE, (data: MinimalMessageWithChannel) => {
      this.getChannel(data.c, (newChannel) => {
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

    socket.on(USER_NAME, (info: UserData) => {
      const data = info;

      this.setState({ 
        admin: data.a,  
        username: data.n
      });
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

  public render(){
    const wrapperClass = "d-flex" + (this.state.sidebar ? "": " toggled");
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
            inventory={this.state.inventory}
            name="inventory"
            selected={this.state.selected === "Inventory"}
            sidebar={this.state.sidebar}
            width={this.state.width}
          />
          <Rooms
            rooms={this.state.roomMessages}
            selected={this.state.selected === "Rooms"}
            sidebar={this.state.sidebar}
            width={this.state.width}
            username={this.state.username}
            getLogs={this.getLogs}
          />
          <CurrentRoom
            rooms={this.state.rooms}
            selected={this.state.selected === "Current room(s)"}
            sidebar={this.state.sidebar}
            width={this.state.width}
          />
          <Maps
            selected={ this.state.selected === "Map" }
            map={ this.state.roomsMap }
          />
          <Commands
            commands={this.state.commands}
            selected={this.state.selected === "Commands"}
          />
        </div>
      </div>
    );
  }

  private getLogs(roomId: string) {
    const room = this.state.roomMessages.get(roomId);

    if (room !== undefined && room.archive.length === 0) {
      this.state.socket.emit(ROOM_LOGS, roomId);
    }
  }

  private handleToggleSidebar() {
    this.setState(state => ({
      sidebar: !state.sidebar
    }));
  }

  private handleToggleMode(selected: VisibleStates) {
    this.setState({ selected });
  }

  private getChannel(roomId: string, callback: (room: RoomMessagesData | undefined) => void) {

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
          }

          callback(newChannel);
        }
      });
    }
  }
}

export default App;