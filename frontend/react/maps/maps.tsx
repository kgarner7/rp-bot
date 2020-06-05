import loadable from "@loadable/component";
import mermaid from "mermaid";
import React, { Fragment } from "react";
import Select, { ValueType, ActionMeta } from "react-select";

import { LINK_CREATE } from "../../../socket/consts";
import { MinimalRoomWithLink, LinkCreation } from "../../../socket/helpers/links";
import Modal from "../util/modal";
import { SELECT_STYLE } from "../util/util";

import { JQueryClickEvent } from "./adminState";
import produce from "immer";
import { Dict } from "../../../helpers/base";

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
  sections: Set<string>;
  selected: boolean;
  socket: SocketIOClient.Socket;
}

interface MapState {
  html: string;
  mode: SelectionState;
  selected: string[];
  waiting?: boolean;
  viewing: string[];
}

export class Maps extends React.PureComponent<MapProps, MapState> {
  public constructor(props: MapProps) {
    super(props);

    this.state = {
      html: "",
      mode: SelectionState.NO_INTERACTION,
      selected: [],
      viewing: []
    };

    this.createLink = this.createLink.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleNewLink = this.handleNewLink.bind(this);
    this.handleStateChange = this.handleStateChange.bind(this);
    this.showNode = this.showNode.bind(this);
  }

  public componentDidUpdate(oldProps: MapProps, oldState: MapState): void {
    if (this.props.map !== oldProps.map || this.state.viewing !== oldState.viewing) {
      if (this.props.map.length > 0) {
        let roomString = "graph LR\n";

        const sectionsMap = new Map<string | undefined, string[]>();

        for (const source of this.props.map) {
          if (this.state.viewing.length > 0 && !this.state.viewing.includes(source.s)) {
            console.log("skipping");
            continue;
          }

          if (source.l.length > 0) {
            for (const link of source.l) {
              let linkString = `${source.i}[${source.n}]`;

              if (link.h) {
                linkString += ".->";
              } else if (link.l) {
                linkString += "-->";
              } else {
                linkString += "==>";
              }

              linkString += `${link.i}[${link.t}]`;

              let targetSection: string | undefined;

              if (source.s === link.s) {
                targetSection = link.s;
              }

              if (sectionsMap.has(targetSection)) {
                sectionsMap.get(targetSection)!.push(linkString);
              } else {
                sectionsMap.set(targetSection, [linkString]);
              }
            }
          } else {
            let targetSection: string | undefined;

            if (source.s === source.s) {
              targetSection = source.s;
            }

            const linkString = `${source.i}[${source.n}]`;

            if (sectionsMap.has(targetSection)) {
              sectionsMap.get(targetSection)!.push(linkString);
            } else {
              sectionsMap.set(targetSection, [linkString]);
            }
          }
        }

        for (const [section, links] of sectionsMap.entries()) {
          if (section) {
            roomString += `subgraph ${section}\n`;
            roomString += `${links.join("\n")}\nend\n`;
          } else {
            roomString += `${links.join("\n")}\n`;
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
                o={selectedRoom.i}
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

    const selectOpts: Array<{ label: string; value: string}> = [];

    for (const section of this.props.sections) {
      selectOpts.push({
        label: section,
        value: section
      });
    }

    return <div className={ className }>
      <div className="col-12 row">
        <Select
          className="col-12"
          isClearable
          isMulti
          onChange={this.handleChange}
          options={selectOpts}
          styles={SELECT_STYLE}
        />
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

  private handleChange(value: any): void {
    const views = value.map((item: Dict<string>) => item.value);
    this.setState({
      viewing: views
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
