import React from "react";

import { LINK_DELETE, LINK_UPDATE } from "../../../socket/consts";
import { MinimalLink, LinkDeletion, LinkChange } from "../../../socket/helpers";

export interface LinkEditorProps extends MinimalLink {
  s: string;
  socket: SocketIOClient.Socket;
}

export interface LinkEditorState {
  e?: boolean;
  h?: boolean;
  l?: boolean;
  n?: string;
}

function hasChange(props: LinkEditorProps, state: LinkEditorState): boolean {
  return ((state.h || false) !== (props.h || false))
    || ((state.l || false) !== (props.l || false))
    || (state.n !== undefined ? state.n !== props.n : false);
}

export class LinkEditor extends React.PureComponent<LinkEditorProps, LinkEditorState> {
  public constructor(props: LinkEditorProps) {
    super(props);

    this.state = {};

    this.cancelEdit = this.cancelEdit.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.startEdit = this.startEdit.bind(this);
  }

  public componentDidUpdate(oldProps: LinkEditorProps): void {
    if (this.state.e) {
      if (hasChange(oldProps, this.state) && !hasChange(this.props, this.state)) {
        this.setState({
          e: false
        });
      }
    }
  }

  public render(): JSX.Element {
    const hidden = this.state.h !== undefined ? this.state.h : this.props.h;
    const locked = this.state.l !== undefined ? this.state.l : this.props.l;
    const name = this.state.n || this.props.n;

    let changed = false;

    if (this.state.e) {
      changed = hasChange(this.props, this.state);
    }

    return <li className="list-group-item">
      <div className="input-group">
        <div className="input-group-prepend">
          <span className="input-group-text">Link to { this.props.t }</span>
        </div>
        <input
          type="text"
          className="form-control"
          name="n"
          value={name}
          disabled={!this.state.e}
          onChange={this.handleChange}
        />
        <div className="input-group-append">
          <span className="input-group-text">
            <input
              type="checkbox"
              name="h"
              checked={hidden}
              disabled={!this.state.e}
              onChange={this.handleChange}
            /> Hidden
          </span>
          <span className="input-group-text">
            <input
              type="checkbox"
              name="l"
              checked={locked}
              disabled={!this.state.e}
              onChange={this.handleChange}
            /> Locked
          </span>
          <button
            className="btn btn-outline-success"
            type="button"
            hidden={!changed}
            onClick={this.handleSave}
          >
            Save
          </button>
          <button
            className="btn btn-outline-warning"
            type="button"
            hidden={!this.state.e}
            onClick={this.cancelEdit}
          >
            Cancel
          </button>
          <button
            className="btn btn-outline-primary"
            type="button"
            hidden={this.state.e}
            onClick={this.startEdit}
          >
            Edit
          </button>
          <button
            className="btn btn-outline-danger"
            type="button"
            onClick={this.handleDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </li>;
  }

  private cancelEdit(): void {
    this.setState({
      e: false
    });
  }

  private handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    switch (event.target.name) {
      case "h":
      case "l": {
        this.setState({
          [event.target.name]: event.target.checked
        });
        break;
      }
      case "n": {
        this.setState({
          n: event.target.value
        });
        break;
      }
      default: break;
    }
  }

  private handleDelete(): void {
    const message = `Are you sure you want to delete link ${this.props.n}?`;

    if (confirm(message)) {
      const data: LinkDeletion = {
        h: this.props.h === true,
        l: this.props.l === true,
        n: this.props.n,
        s: this.props.s,
        t: this.props.i
      };

      this.props.socket.emit(LINK_DELETE, data);
    }
  }

  private handleSave(): void {
    if (hasChange(this.props, this.state)) {
      const hidden = this.state.h !== undefined ? this.state.h : this.props.h;
      const locked = this.state.l !== undefined ? this.state.l : this.props.l;
      const name = this.state.n || this.props.n;

      const data: LinkChange = {
        f: this.props.s,
        n: {
          h: hidden,
          l: locked,
          n: name
        },
        o: {
          h: this.props.h,
          l: this.props.l,
          n: this.props.n
        },
        t: this.props.i
      };

      this.props.socket.emit(LINK_UPDATE, data);
    }
  }

  private startEdit(): void {
    this.setState({
      e: true
    });
  }
}

export default LinkEditor;
