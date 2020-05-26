import React from "react";

import { RoomData } from "./currentRoom";

export interface RoomNameProps {
  classOverride?: string;
  room?: RoomData;

  newName(id: string, oldName: string, newName: string): void;
}

export interface RoomNameState {
  editing?: boolean;
  name?: string;
}

export class RoomName extends React.PureComponent<RoomNameProps, RoomNameState> {
  public constructor(props: RoomNameProps) {
    super(props);

    this.state = {};

    this.handleCancel = this.handleCancel.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }

  public componentDidUpdate(oldProps: RoomNameProps): void {
    if (this.props.room && this.props.room.name !== oldProps.room?.name) {
      this.setState({
        name: undefined,
        editing: false
      });
    }
  }

  public render(): JSX.Element | null {
    if (!this.props.room) {
      return null;
    }

    if (!this.state.editing) {
      return <div className="input-group col-lg-4 col-xs-12 mb-4">
        <textarea
          className="form-control"
          value={ this.props.room.name}
          disabled={true}
        />
        <div className="input-group-append">
          <button
            className="btn btn-outline-success"
            onClick={this.handleEdit}
            type="button"
          >
            Edit name
          </button>
        </div>
      </div>;
    } else {
      const hasChange = this.state.name
        && this.state.name !== this.props.room.name;

      return <div className="input-group col-lg-4 col-xs-12 mb-4">
        <textarea
          className="form-control"
          onChange={ this.handleChange }
          value={ this.state.name || this.props.room.name  }
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
      name: undefined,
      editing: false
    });
  }

  private handleChange(event: React.ChangeEvent<HTMLTextAreaElement>): void {
    this.setState({
      name: event.target.value
    });
  }

  private handleEdit(): void {
    this.setState({ editing: true });
  }

  private handleSave(): void {
    if (this.props.room && this.state.name) {
      this.props.newName(this.props.room.id, this.props.room.name, this.state.name);
    }
  }
}

export default RoomName;
