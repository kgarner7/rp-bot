/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";

import { UserInfo } from "../../../socket/helpers";

interface RoomSelectProps {
  options: string[];
  user?: UserInfo;

  handleChange(original: string, newRoom: string): void;
}

interface RoolSelectState {
  room?: string;
}

export class RoomSelect extends React.PureComponent<RoomSelectProps, RoolSelectState> {
  public constructor(props: RoomSelectProps) {
    super(props);

    this.state = { };

    this.handleCancel = this.handleCancel.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }

  public componentDidUpdate(prevProps: RoomSelectProps): void {
    if (prevProps.user !== this.props.user) {
      this.setState({
        room: undefined
      });
    }
  }

  public render(): JSX.Element | null {
    if (!this.props.user) {
      return null;
    }

    const location = this.state.room || this.props.user.l;
    const notEditing = location === this.props.user.l;

    const options = this.props.options.map(option =>
      <option key={option} value={ option }>
        { option }
      </option>);

    return <div className="input-group mb-3">
      <div className="input-group-prepend">
        <label className="input-group-text">Current room: </label>
      </div>
      <select className="custom-select" value={ location } onChange={ this.handleChange }>
        { options }
      </select>
      <div className="input-group-append">
        <button
          className="btn btn-outline-success"
          type="button"
          hidden={ notEditing }
          onClick={ this.handleSave }
        >
          Save
        </button>
        <button
          className="btn btn-outline-warning"
          type="button"
          hidden={ notEditing }
          onClick={ this.handleCancel }
        >
          Cancel
        </button>
      </div>
    </div>;

  }

  private handleCancel(): void {
    this.setState({ room: undefined });
  }

  private handleChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    this.setState({
      room: event.target.value
    });
  }

  private handleSave(): void {
    if (this.state.room) {
      this.props.handleChange(this.props.user?.l || "", this.state.room);
    }
  }
}

export default RoomSelect;
