import loadable from "@loadable/component";
import mermaid from "mermaid";
import React, { Fragment } from "react";

import { LINK_CREATE } from "../../../socket/consts";
import { MinimalRoomWithLink, LinkCreation } from "../../../socket/helpers";
import Modal from "../util/modal";

import { JQueryClickEvent } from "./adminState";

const AdminState = loadable(() =>
  import(/* webpackChunkName: "adminMapState" */ "./adminState"));

const LinkEditor = loadable(() => 
  import(/* webpackChunkName: "linkEditor" */ "./linkEditor"));

const LinkForm = loadable(() =>
  import(/* webpackChunkName: "adminLinkForm" */ "./linkForm"));

export enum SelectionState {
  NO_INTERACTION = 0,
  VIEW_ROOMS = 1,
  LINK_ROOMS = 2
}

interface MapProps {
  admin?: boolean;
  map: MinimalRoomWithLink[];
  selected: boolean;
  socket: SocketIOClient.Socket;
}

interface MapState {
  html: string;
  mode: SelectionState;
  selected: string[];
  waiting?: boolean;
}

export class Maps extends React.PureComponent<MapProps, MapState> {
  public constructor(props: MapProps) {
    super(props);

    this.state = {
      html: "",
      mode: SelectionState.NO_INTERACTION,
      selected: []
    };

    this.createLink = this.createLink.bind(this);
    this.handleNewLink = this.handleNewLink.bind(this);
    this.handleStateChange = this.handleStateChange.bind(this);
    this.showNode = this.showNode.bind(this);
  }

  public componentDidUpdate(oldProps: MapProps, oldState: MapState): void {
    if (this.props.map !== oldProps.map) {
      if (this.props.map.length > 0) {
        let roomString = "graph TD\n";

        const roomNameMapping = new Map<string, string>();

        for (const room of this.props.map) {
          let roomId: string;

          if (roomNameMapping.has(room.n)) {
            roomId = roomNameMapping.get(room.n) || "";
          } else {
            roomId = room.i;
            roomNameMapping.set(room.n, roomId);
          }

          if (room.l.length > 0) {
            for (const link of room.l) {
              roomString += `${roomId}["${room.n}"]`;

              if (link.h) {
                roomString += `-. "${link.n}" .->`;
              } else if (link.l) {
                roomString += `-- "${link.n}" -->`;
              } else {
                roomString += `== "${link.n}" ==>`;
              }

              let targetId: string;

              if (roomNameMapping.has(link.t)) {
                targetId = roomNameMapping.get(link.t) || "";
              } else {
                targetId = link.i;
                roomNameMapping.set(link.t, targetId);
              }

              roomString += `${targetId}["${link.t}"]\n`;
            }
          } else {
            roomString += `${roomId}["${room.n}"]\n`;
          }
        }

        mermaid.render("id", roomString, code => {
          this.setState({
            html: code
          });
        });
      } else {
        this.setState({
          html: ""
        });
      }

      if (this.state.waiting) {
        $("#mapAdminModal").modal("hide");

        this.setState({
          waiting: false
        });
      }
    }

    if (this.state.mode !== oldState.mode) {
      this.setState({
        selected: []
      });
    }
  }

  public render(): JSX.Element {
    const className = this.props.selected ? "visible": "invisible";

    let body: JSX.Element | string;
    let title: string;

    switch (this.state.mode) {
      case SelectionState.VIEW_ROOMS: {
        const selectedRoom = this.props.map.find(room =>
          room.i === this.state.selected[0]
        );

        if (selectedRoom) {
          title = `Viewing room ${selectedRoom.n}`;

          if (selectedRoom.l.length > 0) {
            const links = selectedRoom.l.map(link => {
              return <LinkEditor
                key={link.i}
                s={selectedRoom.i}
                socket={this.props.socket}
                {...link}/>;
            });

            body = <ul>{links}</ul>;
          } else {
            body = "No links from this room";
          }
        } else {
          body = "";
          title = "";
        }
        break;
      }
      case SelectionState.LINK_ROOMS: {
        let source: MinimalRoomWithLink | undefined;
        let target: MinimalRoomWithLink | undefined;

        for (const room of this.props.map) {
          if (room.i === this.state.selected[0]) {
            source = room;
          } else if (room.i === this.state.selected[1]) {
            target = room;
          }
        }

        if (source && target) {
          body = <LinkForm
            selected={this.state.selected}
            handleNewLink={this.handleNewLink}
          />;
          title = `Creating link from "${source.n}" to "${target.n}"`;
        } else {
          body = "";
          title = "";
        }
        break;
      }
      default: {
        body = "";
        title = "";
      }
    }

    let selectedHeader: JSX.Element | undefined;

    if (this.props.admin
        && this.state.mode === SelectionState.LINK_ROOMS
        && this.state.selected.length === 1) {

      const sourceRoom = this.props.map.find(room =>
        room.i === this.state.selected[0]);

      selectedHeader = <h3 className="col-12">
        Source room: <strong>{sourceRoom?.n || ""}</strong>
      </h3>;
    }

    return <div className={ className }>
      <div className="col-12 row">
        { this.props.admin &&
          <Fragment>
            <AdminState
              mode={this.state.mode}
              createLink={this.createLink}
              handleChange={this.handleStateChange}
              showNode={this.showNode}
            />
            { selectedHeader }
            <Modal
              body={body}
              id="mapAdmin"
              title={title}
            />
          </Fragment>
        }
      </div>
      <div className="col-12">
        <div dangerouslySetInnerHTML={{ __html: this.state.html }}></div>
      </div>
    </div>;
  }

  private createLink(event: JQueryClickEvent): void {
    this.setState(state => {
      const id = event.currentTarget.id;

      if (state.selected.length === 2) {
        return { selected: [id] };
      } else if (state.selected.includes(id)) {
        return { selected: [] };
      } else  {
        return { selected: state.selected.concat(id) };
      }
    }, () => {
      if (this.state.selected.length === 2) {
        $("#mapAdminModal").modal("show");
      } else if (this.state.selected.length === 0) {
        alert("You cannot link a room to itself");
      }
    });
  }

  private handleNewLink(data: LinkCreation): void {
    this.props.socket.emit(LINK_CREATE, data);

    this.setState({
      waiting: true
    });

    setTimeout(() => {
      this.setState({ waiting: false });
    }, 5000);
  }

  private handleStateChange(mode: SelectionState): void {
    this.setState({
      mode
    });
  }

  private showNode(event: JQueryClickEvent): void {
    this.setState({
      selected: [event.currentTarget.id]
    });

    $("#mapAdminModal").modal("show");
  }

}

export default Maps;
