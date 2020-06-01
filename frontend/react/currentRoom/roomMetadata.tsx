import React from "react";

import {
  ROOM_HISTORY,
  ROOM_VISIBILITY
} from "../../../socket/consts";
import {
  RoomVisibility,
  RoomHistoryChange,
  RoomVisibilityChange
} from "../../../socket/helpers/rooms";

import { RoomData } from "./currentRoom";

export interface RoomMetadataProps {
  admin?: boolean;
  room?: RoomData;
  socket: SocketIOClient.Socket;
}

export interface RoomMetadataState {
  editHistory?: boolean;
  editVisibility?: boolean;
  history?: boolean;
  visibility?: RoomVisibility;
}

export class RoomMetadata extends React.PureComponent<RoomMetadataProps, RoomMetadataState> {
  public constructor(props: RoomMetadataProps) {
    super(props);

    this.state = {};

    this.cancelHistory = this.cancelHistory.bind(this);
    this.cancelVisibility = this.cancelVisibility.bind(this);
    this.editHistory = this.editHistory.bind(this);
    this.editVisibility = this.editVisibility.bind(this);
    this.handleHistoryChange = this.handleHistoryChange.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.saveHistory = this.saveHistory.bind(this);
    this.saveVisibility = this.saveVisibility.bind(this);
  }

  public componentDidUpdate(oldProps: RoomMetadataProps): void {
    if (this.props.room !== oldProps.room) {
      this.setState({
        editHistory: false,
        editVisibility: false,
        history: false,
        visibility: undefined
      });
    }
  }

  public render(): JSX.Element | null {
    if (!this.props.room) {
      return null;
    }

    let visibilityString: string;

    switch (this.props.room.visibility) {
      case "private": visibilityString = " private"; break;
      case "publicR": visibilityString = " publicly readable"; break;
      case "publicW": visibilityString = " publicly writeable"; break;
      default: visibilityString = "";
    }

    let adminHistory:    JSX.Element | undefined;
    let adminVisibility: JSX.Element | undefined;

    if (this.props.admin) {
      if (this.state.editVisibility) {
        adminVisibility = <div className="mt-4">
          <div className="btn-group btn-group-toggle" data-toggle="buttons">
            <label
              className={`btn btn-primary${this.state.visibility === "publicW" ? " active": ""}`}
              id="publicW"
              onClick={this.handleVisibilityChange}
            >
              <input type="radio" name="v"/>
              Publically writeable
            </label>
            <label
              className={`btn btn-primary${this.state.visibility === "publicR" ? " active": ""}`}
              id="publicR"
              onClick={this.handleVisibilityChange}
            >
              <input type="radio" name="v"/>
              Publically readable
            </label>
            <label
              className={`btn btn-primary${this.state.visibility === "private" ? " active": ""}`}
              id="private"
              onClick={this.handleVisibilityChange}
            >
              <input type="radio" name="v"/>
              Private
            </label>
          </div>
          <button
            type="button"
            className="btn btn-success"
            hidden={this.state.visibility === this.props.room.visibility}
            onClick={this.saveVisibility}
          >
            Save change
          </button>
          <button
            type="button"
            className="btn btn-warning"
            onClick={this.cancelVisibility}
          >
            Cancel change
          </button>
        </div>;
      } else {
        adminVisibility = <button
          type="button"
          className="btn btn-primary ml-4"
          onClick={this.editVisibility}
        >
          Edit visibility
        </button>;
      }

      if (this.state.editHistory) {
        adminHistory = <div className="mt-4">
          <div className="btn-group btn-group-toggle" data-toggle="buttons">
            <label
              className={`btn btn-primary${this.state.history ? " active": ""}`}
              onClick={this.handleHistoryChange}
            >
              <input type="checkbox" checked={this.state.history}/>
              {this.state.history ? "Showing history" : "Hiding history"}
            </label>
          </div>
          <button
            type="button"
            className="btn btn-success"
            hidden={(this.state.history || false) === (this.props.room.history || false)}
            onClick={this.saveHistory}
          >
            Save change
          </button>
          <button
            type="button"
            className="btn btn-warning"
            onClick={this.cancelHistory}
          >
            Cancel change
          </button>
        </div>;
      } else {
        adminHistory = <button
          type="button"
          className="btn btn-primary ml-4"
          onClick={this.editHistory}
        >
          Edit history
        </button>;
      }
    }

    return <div className="col-12 row mb-4">
      <h4 className="col-6">This room is
        <strong>{visibilityString}</strong>
        { adminVisibility }
      </h4>
      <h4 className="col-6">History is
        <strong>{this.props.room?.history ? " saved": " not saved" }</strong>
        { adminHistory }
      </h4>
    </div>;
  }

  private cancelHistory(): void {
    this.setState({
      editHistory: false,
      history: undefined
    });
  }

  private editHistory(): void {
    this.setState({
      editHistory: true,
      history: this.props.room?.history
    });
  }

  private cancelVisibility(): void {
    this.setState({
      editVisibility: false,
      visibility: undefined
    });
  }

  private editVisibility(): void {
    this.setState({
      editVisibility: true,
      visibility: this.props.room?.visibility
    });
  }

  private handleHistoryChange(): void {
    this.setState(state => ({
      history: !state.history
    }));
  }

  private handleVisibilityChange(event: React.MouseEvent<HTMLLabelElement, MouseEvent>): void {
    if (event.currentTarget) {
      this.setState({
        visibility: event.currentTarget.id as RoomVisibility
      });
    }
  }

  private saveHistory(): void {
    if (this.props.room && this.state.history !== undefined &&
        this.props.room.history !== this.state.history) {

      if (confirm(`Do you want to change the ability to see history in ${this.props.room.name}?`)) {
        const data: RoomHistoryChange = {
          n: this.state.history === true,
          r: this.props.room.id
        };

        this.props.socket.emit(ROOM_HISTORY, data);
      }
    }
  }

  private saveVisibility(): void {
    if (this.props.room && this.state.visibility &&
        this.props.room.visibility !== this.state.visibility) {

      if (confirm(`Are you sure you want to change the visibility of ${this.props.room.name}?`)) {
        const data: RoomVisibilityChange = {
          n: this.state.visibility,
          o: this.props.room.visibility,
          r: this.props.room.id
        };

        this.props.socket.emit(ROOM_VISIBILITY, data);
      }
    }
  }
}
