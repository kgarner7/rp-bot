import { Component } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import Inventory from "./inventory";
import Rooms from "./rooms";
import CurrentRoom from "./currentRoom";
import Commands from "./commands";
import { sanitize } from "dompurify";
import { 
  MESSAGES_GET,
  MESSAGE_CREATE,
  MESSAGE_DELETE,
  MESSAGE_UPDATE,
  ROOM_INFORMATION,
  ROOM_LOGS,
  USER_INVENTORY_CHANGE,
  USER_NAME,
  COMMANDS
} from "../../dist/socket/consts";

const USER_OPS = ["Inventory", "Rooms", "Current room(s)", "Commands"];
const ADMIN_OPS = ["View users"];

const converter = new showdown.Converter();
const startupTasks = [
  USER_NAME, 
  USER_INVENTORY_CHANGE, 
  ROOM_INFORMATION, 
  MESSAGES_GET, 
  COMMANDS
];

function toHtml(content) {
  return sanitize(converter.makeHtml(content));
}

const socket = io();

export class App extends Component{
  constructor(props) {
    super(props);

    this.state = {
      admin: false,
      commands: {},
      inventory: [],
      rooms: new Map(),
      selected: "Inventory",
      sidebar: true,
      socket,
      username: "",
      width: document.body.clientWidth
    };

    socket.on(COMMANDS, data => {
      const json = JSON.parse(data),
        commands = { };

      for (const [name, command] of Object.entries(json)) {
        const comm = { description: command.d };

        if (command.a) comm.a = true;
        comm.uses = command.u.map(use => {
          const usage = { use: use.u };

          if (use.a) usage.admin = true;
          if (use.e) usage.explanation = use.e;
          if (use.x) usage.example = use.x;

          return usage;
        });
        
        commands[name] = comm;
      }

      this.setState({ commands });
    });

    socket.on(USER_INVENTORY_CHANGE, data => { 
      const json = JSON.parse(data);

      for (const item of json) {
        item.d = toHtml(item.d);
      }

      this.setState({ inventory: json });
    });

    socket.on(ROOM_INFORMATION, rooms => {
      const json = JSON.parse(rooms);
      
      this.setState(state => {
        const roomsMap = new Map();

        for (const room of json) {
          const data = state.rooms.get(room.i) || { 
            archive: [],
            messages: [],
            updatedAt: new Date().getTime()
          };

          data.description = toHtml(room.d),
          data.hasArchive = room.hasArchive;
          data.inventory = room.c || data.inventory;
          data.name = room.n;
          data.present = room.p === true;
          data.section = room.s;

          roomsMap.set(room.i, data);
        }

        return { rooms: roomsMap };
      });
    });

    socket.on(ROOM_LOGS, (messagesJson, roomId) => {
      this.setState(state => {
        const room = state.rooms.get(roomId);

        if (room !== undefined) {
          const messages = JSON.parse(messagesJson);

          if (messages.length > 0) {
            room.archive = messages.map(msg => ({      
              author: msg.a,
              content: msg.t,
              id: msg.i,
              time: msg.d
            }));

            const lastUpdate = room.archive[room.archive.length - 1].time;
            room.updatedAt = Math.max(new Date(lastUpdate).getTime(), room.updatedAt);
            room.hasArchive = true;

            state.rooms.set(roomId, room);
          } 
        }
        return { rooms: state.rooms };
      });
    });

    socket.on(MESSAGES_GET, data => {
      this.setState(state => {        
        for (const [channel, messages] of Object.entries(JSON.parse(data))) {
          const room = state.rooms.get(channel);

          if (room) {
            let updateTime = messages[0].d;

            room.messages = messages.map(msg => {
              if (msg.d > updateTime) updateTime = msg.d;

              return {
                author: msg.a,
                content: msg.t,
                id: msg.i,
                time: msg.d
              };
            });

            room.updatedAt = new Date(parseInt(updateTime)).getTime();
            state.rooms.set(channel, room);
          }
        }
        
        return { rooms: state.rooms };
      })
    });

    socket.on(MESSAGE_CREATE, data => {
      this.setState(state => {
        const channel = state.rooms.get(data.c);

        if (channel) {
          channel.messages.push({
            author: data.a,
            content: data.t,
            id: data.i,
            time: data.d
          });
  
          channel.updatedAt = new Date().getTime();  
        }

        return { rooms: state.rooms };
      });
    });

    socket.on(MESSAGE_DELETE, data => {
      this.setState(state => {
        const channel = state.rooms.get(data.c);
        if (channel) {
          let idx;

          for (idx = channel.messages.length - 1; idx >= 0; idx--) {
            if (channel.messages[idx].id === data.i) {
              channel.messages.splice(idx, 1);
              channel.updatedAt = new Date().getTime();
              break;
            }
          }

          return { rooms: state.rooms };
        }
      });
    });

    socket.on(MESSAGE_UPDATE, data => {
      this.setState(state => {
        const channel = state.rooms.get(data.c);

        if (channel) {
          let idx;
  
          for (idx = channel.messages.length - 1; idx >= 0; idx--) {
            if (channel.messages[idx].id === data.i) {
              channel.messages.content = data.t;
              channel.updatedAt = new Date().getTime();
              break;
            }
          }
  
        }
        return { rooms: state.rooms };
      });
    });

    socket.on(USER_NAME, info => {
      const data = JSON.parse(info);

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

  getLogs(roomId) {
    const room = this.state.rooms.get(roomId);

    if (room !== undefined && room.archive.length === 0) {
      this.state.socket.emit(ROOM_LOGS, roomId);
    }
  }

  handleToggleSidebar() {
    this.setState(state => ({
      sidebar: !state.sidebar
    }));
  }

  handleToggleMode(selected) {
    this.setState({ selected });
  }

  render(){
    const wrapperClass = "d-flex" + (this.state.sidebar ? "": " toggled");
    return(
      <div id="wrapper" className={wrapperClass}>
        <Sidebar admin={this.state.admin} options={USER_OPS} adminOps={ADMIN_OPS} handleSelect={this.handleToggleMode}/>
        <div id="page-content-wrapper">
          <Header handleToggle={this.handleToggleSidebar} username={this.state.username}/>
          <Inventory inventory={this.state.inventory} name="inventory" selected={this.state.selected === "Inventory"} sidebar={this.state.sidebar} width={this.state.width}/>
          <Rooms rooms={this.state.rooms} selected={this.state.selected === "Rooms"} sidebar={this.state.sidebar} width={this.state.width} username={this.state.username} getLogs={this.getLogs}/>
          <CurrentRoom rooms={this.state.rooms} selected={this.state.selected === "Current room(s)"} sidebar={this.state.sidebar} width={this.state.width}/>
          <Commands commands={this.state.commands} selected={this.state.selected === "Commands"}/>
        </div>
      </div>
    );
  }
}

export default App;