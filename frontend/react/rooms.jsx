import React, { Component} from "react";
import { Responsive } from "react-grid-layout";
import SearchBar from "./search";

const options = [
  ["ztoa-t", "Recent messages"],
  ["atoz-t", "Older messages"], 
  ["atoz-s", "A to Z (by section)"], 
  ["ztoa-s", "Z to A (by section)"],
  ["atoz-r", "A to Z (by room)"], 
  ["ztoa-r", "Z to A (by room)"],
];

const sizes = ["lg", "md", "sm", "xs", "xxs"];
const cols = { lg: 12, md: 10, sm: 6, xs: 6, xxs: 6 };

const escapeRegex = str => 
  str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");

const generateRegex = rule =>
  new RegExp(`^${rule.split("*").map(escapeRegex).join(".*")}.*`);


export function compareString(a, b, sign) {
  if (a > b) {
    return sign;
  } else if (a < b) {
    return -sign;
  } else {
    return 0;
  }
}

class Messge extends Component {
  render() {
    const className = (this.props.isAuthor ? "right": "left") + " alert alert-primary",
      name = this.props.isAuthor ? "You" : this.props.author,
      time = new Date(parseInt(this.props.time))
        .toLocaleTimeString();

    return (
      <div className={className}>
        <div className="msg-header">{name} <span>({time})</span></div>
        <div>{this.props.content}</div>
      </div>
    );
  }
}

class Room extends Component {
  constructor(props) {
    super(props)
    this.state = { scroll: -1 };

    this.messages = React.createRef();
    this.handleScroll = this.handleScroll.bind(this);
  }

  componentDidMount() {
    const scrollTarget = this.state.scroll === -1 ?
      this.messages.current.scrollHeight : this.state.scroll;

    this.messages.current.scrollTo(0, scrollTarget);
  }

  componentDidUpdate() {
    if (this.state.scroll === -1) {
      this.messages.current.scrollTo(0, this.messages.current.scrollHeight);
    }
  }

  handleScroll() {
    const elem = this.messages.current,
      scroll = elem.scrollTop === elem.scrollTopMax ? 
        -1 : elem.scrollTop;;

    this.setState({ scroll });
  }

  render() {
    const messages = this.props.messages.map(message => {
      const isAuthor = this.props.username === message.author;

      return (<div key={message.id}>
        <Messge isAuthor={isAuthor} author={message.author} content={message.content} time={message.time} />
      </div>)
    });

    return (
      <div className="card">
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
}

class RoomModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      filter: ""
    };

    this.handleFilter = this.handleFilter.bind(this);
  }

  handleFilter(event) {
    this.setState({ filter: event.target.value });
  }

  render() {
    let room = this.props.rooms.get(this.props.roomId);

    if (room === undefined) {
      room = {
        archive: [],
        messages: []
      };
    }

    const filter = this.state.filter,
      messages = [], 
      noFilter = filter === "";

    for (const message of room.archive) {
      const isAuthor = this.props.username === message.author;

      if (noFilter || message.content.indexOf(filter) !== -1) {
        messages.push((
          <Messge key={message.id} isAuthor={isAuthor} author={message.author} content={message.content} time={message.time} />
        ));
      }
    }

    if (room.archive.length > 0) {
      messages.push((
        <hr key="hr" className="bg-dark"/>
      ));
    }

    for (const message of room.messages) {
      const isAuthor = this.props.username === message.author;

      if (noFilter || message.content.indexOf(filter) !== -1) {
        messages.push((
          <Messge key={message.id} isAuthor={isAuthor} author={message.author} content={message.content} time={message.time} />
        ));
      }
    }

    let search = undefined;
    if (messages.length > 0 || this.state.filter !== "") {
      search = (<SearchBar filter={this.state.filter} handleFilter={this.handleFilter} options={[]} placeholder={"Enter text to search"} />) 
    }

    let separator = messages.length > 0 ? (<hr className="bg-dark"/>): undefined;

    return (
      <div className="modal fade" id="roomsModal" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="roomsModalLabel">{room.name} ({room.section})</h5>
              <button type="button" className="close" data-dismiss="modal">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div dangerouslySetInnerHTML={{ __html: room.description}}></div>
              <hr className="bg-dark"/>
              {search}
              {separator}
              <div className="messages">{messages}</div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-success" onClick={() => this.props.getLogs(this.props.roomId)}>
                Get logs
              </button>
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class Rooms extends Component {
  constructor(props) {
    super(props);

    this.state = {
      cols: 12,
      filter: "",
      roomId: undefined,
      sizes: new Map(),
      sort: "ztoa-t",
    }

    this.handleFilter = this.handleFilter.bind(this);
    this.handleLayout = this.handleLayout.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handleWidth = this.handleWidth.bind(this);
  }

  handleFilter(event) {
    this.setState({ filter: event.target.value });
  }

  handleLayout(layout) {
    const layoutMap = new Map();

    for(const room of layout) {
      layoutMap.set(room.i, [room.w, room.h]);
    }

    this.setState({ sizes: layoutMap });
  }

  toggleModal(roomId) {
    this.setState({ roomId });
    $("#roomsModal").modal("show");
  }

  handleSort(sort) {
    this.setState({ sort });
  }

  handleWidth(_width, _margin, cols) {
    this.setState({ cols });
  }

  render() {
    if (!this.props.selected) return null;

    const layout = [],
      width = this.props.width - (this.props.sidebar ? 200 : 0);
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

    if (sort !== "none") {
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
        const elem = this.state.sizes.get(name);

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
          <Room section={room[1].section} description={room[1].description} name={name} inventory={room[1].inventory} messages={messages} username={this.props.username} toggleModal={this.toggleModal} id={room[0]}/>
        </div>
      );
    });

    const layouts = {};

    for (const key of sizes) {
      layouts[key] = layout;
    }

    return (
      <div>
        <SearchBar filter={this.state.filter} handleFilter={this.handleFilter} options={options} handleSort={this.handleSort} placeholder={"a room name, wildcard (*), or list (comma separated)"}/>
        <Responsive className="layout rooms" rowHeight={60} width={width} layouts={layouts} onLayoutChange={this.handleLayout} onWidthChange={this.handleWidth} draggableCancel={".no-drag"} cols={cols}>
          {elements}
        </Responsive>
        <RoomModal getLogs={this.props.getLogs} roomId={this.state.roomId} rooms={this.props.rooms} username={this.props.username} />
      </div>
    )
  }
}

export default Rooms;