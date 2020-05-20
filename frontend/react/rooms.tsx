import React from "react";
import { Responsive, Layout } from "react-grid-layout";
import SearchBar from "./search";
import { MinimalItem } from "../../socket/helpers";

enum RoomSortOptions {
  NONE = "none",
  NEWEST_MESSAGES = "ztoa-t",
  OLDEST_MESSAGES = "atoz-t",
  ALPHA_INC_SECTION = "atoz-s",
  ALPHA_DEC_SECTION = "ztoa-s",
  ALPHA_INC_ROOM = "atoz-r",
  ALPHA_DEC_ROOM = "ztoa-r"
}

const options: Array<[RoomSortOptions, string]> = [
  [RoomSortOptions.NONE, "none"],
  [RoomSortOptions.NEWEST_MESSAGES, "Recent messages"],
  [RoomSortOptions.OLDEST_MESSAGES, "Older messages"], 
  [RoomSortOptions.ALPHA_INC_SECTION, "A to Z (by section)"], 
  [RoomSortOptions.ALPHA_DEC_SECTION, "Z to A (by section)"],
  [RoomSortOptions.ALPHA_INC_ROOM, "A to Z (by room)"], 
  [RoomSortOptions.ALPHA_DEC_ROOM, "Z to A (by room)"],
];

const sizes = ["lg", "md", "sm", "xs", "xxs"];
const cols = { lg: 12, md: 10, sm: 6, xs: 6, xxs: 6 };

function escapeRegex(input: string): string {
  return input.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function generateRegex(rule: string): RegExp {
  return new RegExp(`^${rule.split("*").map(escapeRegex).join(".*")}.*`)
}

export function compareString<T>(a: T, b: T, sign: number): number {
  if (a > b) {
    return sign;
  } else if (a < b) {
    return -sign;
  } else {
    return 0;
  }
}

interface MessageProps {
  author: string;
  content: string;
  isAuthor: boolean;
  time: Date;
}

function Message(props: MessageProps): JSX.Element {
  const className = (props.isAuthor ? "right": "left") + " alert alert-primary";
  const name = props.isAuthor ? "You" : props.author;
  const time = new Date(props.time).toLocaleString("en-US");

  return (
    <div className={className}>
      <div className="msg-header">{name} <span>({time})</span></div>
      <div>{props.content}</div>
    </div>
  );
}

export interface MessageData {
  author: string;
  content: string;
  id: string;
  time: Date;
}


interface RoomProps {
  description: string;
  id: string;
  messages: MessageData[];
  name: string;
  section: string;
  username: string;

  toggleModal(id: string): void;
}

interface RoomState {
  scroll: number;
}

class Room extends React.Component<RoomProps, RoomState> {
  private messages: React.RefObject<any>;

  public constructor(props: RoomProps) {
    super(props)
    this.state = { scroll: -1 };

    this.messages = React.createRef();
    this.handleScroll = this.handleScroll.bind(this);
  }

  public componentDidMount() {
    const scrollTarget = this.state.scroll === -1 ?
      this.messages.current!.scrollHeight : this.state.scroll;

    this.messages.current!.scrollTo(0, scrollTarget);
  }

  public componentDidUpdate() {
    if (this.state.scroll === -1) {
      this.messages.current!.scrollTo(0, this.messages.current!.scrollHeight);
    }
  }

  public render() {
    const messages = this.props.messages.map(message => {
      const isAuthor = this.props.username === message.author;

      return (<div key={message.id}>
        <Message isAuthor={isAuthor} author={message.author} content={message.content} time={message.time} />
      </div>)
    });

    return (
      <div className="card room">
        <div className="card-body">
          <h5 className="card-title">{this.props.name} ({this.props.section})</h5>
          <button type="button" className="close" onClick={() => this.props.toggleModal(this.props.id)}>
            <span>^</span>
          </button>
          <div className="card-text" ref={this.messages} onScroll={this.handleScroll}>
            {messages}
          </div>
        </div>
      </div>
    );
  }

  private handleScroll() {
    const elem = this.messages.current!
    const scroll = elem.scrollTop === elem.scrollTopMax ? 
        -1 : elem.scrollTop;;

    this.setState({ scroll });
  }
}

function matchMessageToFilters(filters: string[], message: MessageData) {
  if (filters.length === 0) return true;
  
  for (const filter of filters) {
    if (filter.startsWith("a:")) {
      const nickname = filter.substring(2);

      if (message.author.startsWith(nickname)) {
        return true;
      }
    } else {
      if (message.content.indexOf(filter) !== -1) {
        return true;
      }
    }
  }
  return false;
}

export interface RoomMessagesData {
  archive: MessageData[];
  description: string;
  hasArchive?: boolean;
  messages: MessageData[];
  name: string;
  section: string;
  updatedAt?: number;
}

interface RoomModalProps {
  roomId: string;
  rooms: Map<string, RoomMessagesData>;
  username: string;

  getLogs(roomId: string): void;
}

interface RoomModalState {
  filter: string;
}

class RoomModal extends React.Component<RoomModalProps, RoomModalState> {
  constructor(props: RoomModalProps) {
    super(props);

    this.state = {
      filter: ""
    };

    this.handleFilter = this.handleFilter.bind(this);
  }
  
  public render() {
    let room = this.props.rooms.get(this.props.roomId);

    let roomArchives: MessageData[];
    let roomMessages: MessageData[];

    if (room) {
      roomArchives = room.archive;
      roomMessages = room.messages;
    } else {
      roomArchives = [];
      roomMessages = [];
    }

    const filters = this.state.filter.split(",").filter(rule => rule.length > 0),
      messages = [];

    for (const message of roomArchives) {
      const isAuthor = this.props.username === message.author;

      if (matchMessageToFilters(filters, message)) {
        messages.push((
          <Message key={message.id} isAuthor={isAuthor} author={message.author} content={message.content} time={message.time} />
        ));
      }
    }

    let showLogButton = undefined;

    if (roomArchives.length > 0) {
      messages.push((
        <hr key="hr" className="bg-dark"/>
      ));
    } 

    if (!room || !room.hasArchive) {
      showLogButton = (
        <button
          type="button"
          className="btn btn-success"
          onClick={() => this.props.getLogs(this.props.roomId)}
        >
          Get logs
        </button>
      );
    }

    for (const message of roomMessages) {
      const isAuthor = this.props.username === message.author;

      if (matchMessageToFilters(filters, message)) {
        messages.push((
          <Message key={message.id} isAuthor={isAuthor} author={message.author} content={message.content} time={message.time} />
        ));
      }
    }

    let search = undefined;
    if (messages.length > 0 || this.state.filter !== "") {
      search = <SearchBar
        name={this.props.roomId}
        filter={this.state.filter}
        handleFilter={this.handleFilter}
        options={[]}
        placeholder={"Enter text to search, or a: to find a sender"}
      />; 
    }

    let separator = messages.length > 0 ? (<hr className="bg-dark"/>): undefined;

    return (
      <div className="modal fade" id="roomsModal" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="roomsModalLabel">{room?.name} ({room?.section})</h5>
              <button type="button" className="close" data-dismiss="modal">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div dangerouslySetInnerHTML={{ __html: room?.description || ""}}></div>
              <hr className="bg-dark"/>
              {search}
              {separator}
              <div className="messages">{messages}</div>
            </div>
            <div className="modal-footer">
              {showLogButton}
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private handleFilter(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ filter: event.target.value });
  }
}

interface RoomsProps {
  rooms: Map<string, RoomMessagesData>;
  selected: boolean;
  sidebar: boolean;
  width: number;
  username: string;

  getLogs(roomId: string): void;
}

interface RoomsState {
  cols: number;
  filter: string;
  roomId?: string;
  sizes: LayoutMap;
  sort: RoomSortOptions;
}

type LayoutMap = Map<string, [number, number]>;

class Rooms extends React.Component<RoomsProps, RoomsState> {
  public constructor(props: RoomsProps) {
    super(props);

    this.state = {
      cols: 12,
      filter: "",
      roomId: undefined,
      sizes: new Map(),
      sort: RoomSortOptions.NEWEST_MESSAGES
    };

    this.handleFilter = this.handleFilter.bind(this);
    this.handleLayout = this.handleLayout.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handleWidth = this.handleWidth.bind(this);
  }

  public render() {
    const layout: Layout[] = [];
    const width = this.props.width - (this.props.sidebar ? 200 : 0);
    let x = 0, y = 0;

    let rooms = Array.from(this.props.rooms.entries());
    const sort = this.state.sort;

    if (this.state.filter !== "") {
      const filterRules = this.state.filter.split(",")
        .filter(rule => rule.replace("s:", "").length > 0)
        .map(generateRegex);

      rooms = rooms.filter(room => {
        for (const rule of filterRules) {
          
          if (rule.test(room[1].name) || rule.test("s:" + room[1].section)) {
            return true;
          }
        }
        return false;
      });
    }

    if (sort !== RoomSortOptions.NONE) {
      const sign = sort.startsWith("atoz") ? 1: -1;

      rooms = rooms.sort((first, second) => {
        let a = first[1], b = second[1];

        if (sort.endsWith("-s")) {
          return compareString(a.section, b.section, sign);
        } else if (sort.endsWith("-r")) {
          return compareString(a.name, b.name, sign);
        } else {
          return compareString(a.updatedAt, b.updatedAt, sign); 
        }
      });
    }

    const elements = rooms.map(room => {
      const name = room[1].name;
      let height = 4, width = 6;

      if (this.state.sizes.has(name)) {
        const elem = this.state.sizes.get(name)!;

        width = elem[0];
        height = elem[1];
      }

      layout.push({
        i: name,
        x,
        y,
        w: width,
        h: height
      });

      x += 6;

      if (x >= this.state.cols) {
        x = 0;
        y++;
      }

      const messages = room[1].archive
        .concat(room[1].messages);

      return (
        <div key={name}>
          <Room
            id={room[0]}
            section={room[1].section}
            description={room[1].description}
            name={name} 
            messages={messages} 
            username={this.props.username}
            toggleModal={this.toggleModal}
          />
        </div>
      );
    });

    const layouts: ReactGridLayout.Layouts = {};

    for (const key of sizes) {
      layouts[key] = layout;
    }

    const className = this.props.selected ? "visible": "invisible";

    return (
      <div className={className}>
        <SearchBar<RoomSortOptions>
          filter={this.state.filter}
          handleFilter={this.handleFilter}
          options={options}
          handleSort={this.handleSort}
          placeholder="a room name, sector (s:), wildcard (*), or list (comma separated)"
          name="rooms"
        />
        <Responsive className="layout rooms" rowHeight={60} width={width} layouts={layouts} onLayoutChange={this.handleLayout} onWidthChange={this.handleWidth} cols={cols}>
          {elements}
        </Responsive>
        <RoomModal
          getLogs={this.props.getLogs}
          roomId={this.state.roomId || ""} 
          rooms={this.props.rooms}
          username={this.props.username}
        />
      </div>
    )
  }

  private handleFilter(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ filter: event.target.value });
  }  

  private handleLayout(layout: ReactGridLayout.Layout[]) {
    if (layout.length === 0) {
      return;
    }

    const currentMap = this.state.sizes;
    const layoutMap = new Map();

    let changed = false;

    for(const item of layout) {
      const currentLayout = currentMap.get(item.i),
        layoutChange = currentLayout === undefined ||
          currentLayout[0] !== item.w || currentLayout[1] !== item.h;

      if (layoutChange) {
        layoutMap.set(item.i, [item.w, item.h]);
        changed = true;
      }
    }

    if (changed) {
      this.setState({ sizes: layoutMap })
    }
  }

  private toggleModal(roomId: string) {
    this.setState({ roomId });
    $("#roomsModal").modal("show");
  }

  private handleSort(sort: RoomSortOptions) {
    this.setState({ sort });
  }

  private handleWidth(_width: number, _margin: [number, number], cols: number) {
    if (cols !== this.state.cols) {
      this.setState({ cols });
    }
  }
}

export default Rooms;