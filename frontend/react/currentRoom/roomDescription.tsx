import React from "react";

import { RoomData } from "./currentRoom";

export interface RoomDescriptionProps {
  admin: boolean;
  classOverride?: string;
  room?: RoomData;

  delete(roomId: string): void;
  newDescription(id: string, oldDescription: string, newDescription: string): void;
}

export interface RoomDescriptionState {
  description?: string;
  editing?: boolean;
}

export class RoomDescription extends React.PureComponent<RoomDescriptionProps,
RoomDescriptionState> {
  public constructor(props: RoomDescriptionProps) {
    super(props);

    this.state = {};

    this.handleCancel = this.handleCancel.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }

  public componentDidUpdate(oldProps: RoomDescriptionProps): void {
    if (this.props.room && this.props.room.description !== oldProps.room?.description) {
      this.setState({
        description: undefined,
        editing: false
      });
    }
  }

  public render(): JSX.Element | null {
    if (!this.props.room) {
      return null;
    }

    let className = "input-group mb-4 ";

    if (this.props.admin) {
      className += "col-lg-8 col-xs-12";
    }

    if (!this.props.admin) {
      return <div className={className}>
        <div className="form-control">{ this.props.room.description }</div>
      </div>;
    } else if (!this.state.editing) {
      return <div className={className}>
        <textarea
          className="form-control"
          value={ this.props.room.description }
          disabled={true}
        />
        <div className="input-group-append">
          <button
            className="btn btn-outline-success"
            onClick={this.handleEdit}
            type="button"
          >
            Edit description
          </button>
          <button
            className="btn btn-outline-danger"
            onClick={this.handleDelete}
            type="button"
          >
            Delete room
          </button>
        </div>
      </div>;
    } else {
      const hasChange = this.state.description
        && this.state.description !== this.props.room.description;

      return <div className={className}>
        <textarea
          className="form-control"
          onChange={ this.handleChange }
          value={ this.state.description || this.props.room.description  }
        />
        <div className="input-group-append">
          <button
            className="btn btn-outline-success"
            hidden={ !hasChange }
            onClick={this.handleSave}
            type="button"
          >
            Save
          </button>
          <button
            className="btn btn-outline-warning"
            onClick={this.handleCancel}
            type="button"
          >
            Cancel edit
          </button>
        </div>
      </div>;
    }
  }

  private handleCancel(): void {
    this.setState({
      description: undefined,
      editing: false
    });
  }

  private handleChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    this.setState({
      description: event.target.value
    });
  }

  private handleDelete(): void {
    if (this.props.room) {
      const message = `Are you sure you want to delete the room ${this.props.room.name}?`;

      if (confirm(message)) {
        this.props.delete(this.props.room.id);
      }
    }
  }

  private handleEdit(): void {
    this.setState({ editing: true });
  }

  private handleSave(): void {
    if (this.props.room && this.state.description) {
      this.props.newDescription(this.props.room.id,
        this.props.room.description,
        this.state.description);
    }
  }
}

export default RoomDescription;
