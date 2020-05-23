/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";

import { MinimalItem } from "../../../socket/helpers";
import { defaultValue } from "../util/util";

interface UserItemEditorProps extends MinimalItem {
  handleItemChange(oldItem: MinimalItem | undefined, newItem: MinimalItem | undefined): void;
}

interface UserItemEditorState {
  d?: string;
  h?: boolean;
  l?: boolean;
  q?: number;
}

export class UserItemEditor extends React.PureComponent<UserItemEditorProps, UserItemEditorState> {
  public constructor(props: UserItemEditorProps) {
    super(props);

    this.state = {};

    this.handleCancel = this.handleCancel.bind(this);
    this.handleDelete = this.handleDelete.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }

  public componentDidUpdate(prevProps: MinimalItem): void {
    if (prevProps.d !== this.props.d ||
        prevProps.h !== this.props.h ||
        prevProps.l !== this.props.l ||
        prevProps.n !== this.props.n ||
        prevProps.q !== this.props.q) {

      this.setState({
        d: undefined,
        h: undefined,
        l: undefined,
        q: undefined
      });
    }
  }

  public render(): JSX.Element {
    const description = this.state.d !== undefined ? this.state.d: this.props.d;
    const hidden = this.state.h !== undefined ? this.state.h: this.props.h;
    const locked = this.state.l !== undefined ? this.state.l: this.props.l;
    const quantity = this.state.q || this.props.q || 1;

    const editing = description !== this.props.d
      || defaultValue(hidden, false) !== defaultValue(this.props.h, false)
      || defaultValue(locked, false) !== defaultValue(this.props.l, false)
      || quantity !== defaultValue(this.props.q, 1);

    const valid = editing
      && description.length > 0
      && quantity > 0;

    return <li className="list-group-item">
      <div className="input-group">
        <div className="input-group-prepend">
          <span className="input-group-text">{ this.props.n }</span>
        </div>
        <input
          type="number"
          className="form-control"
          name="q"
          value={ quantity }
          onChange={ this.handleChange }
          min={1}
        />
        <div className="input-group-append">
          <span className="input-group-text">
            <input
              type="checkbox"
              name="h"
              checked={ hidden }
              onChange={ this.handleChange }
            /> Hidden
          </span>
          <span className="input-group-text">
            <input
              type="checkbox"
              name="l"
              checked={ locked }
              onChange={ this.handleChange }
            /> Locked
          </span>
        </div>
      </div>
      <div className="input-group input-group-sm">
        <textarea
          className="form-control"
          value={ description }
          name="d"
          rows={2}
          onChange={ this.handleChange }
        />
        <div className="input-group-append">
          <button
            className="btn btn-outline-success"
            type="button"
            hidden={ !valid }
            onClick={ this.handleSave }
          >
            Save
          </button>
          <button
            className="btn btn-outline-warning"
            type="button"
            hidden={ !editing }
            onClick={ this.handleCancel }
          >
            Cancel
          </button>
          <button
            className="btn btn-outline-danger"
            type="button"
            onClick={ this.handleDelete }
          >
            Delete
          </button>
        </div>
      </div>
    </li>;
  }

  private handleCancel() {
    this.setState({
      d: undefined,
      h: undefined,
      l: undefined,
      q: undefined
    });
  }

  private handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    const name = event.target.name as keyof UserItemEditorState;

    switch (name) {
      case "d": {
        this.setState({
          [name]: event.target.value
        });
        break;
      }
      case "h":
      case "l": {
        this.setState({
          [name]: (event as React.ChangeEvent<HTMLInputElement>).target.checked
        });
        break;
      }
      case "q": {
        this.setState({
          q: (event as React.ChangeEvent<HTMLInputElement>).target.valueAsNumber
        });
        break;
      }
      default: break;
    }
  }

  private handleDelete(): void {
    if (confirm("Do you want to delete this item?")) {
      this.props.handleItemChange(this.props, undefined);
    }
  }

  private handleSave(): void {
    const description = this.state.d !== undefined ? this.state.d: this.props.d;
    const hidden = this.state.h !== undefined ? this.state.h: this.props.h;
    const locked = this.state.l !== undefined ? this.state.l: this.props.l;
    const quantity = this.state.q || this.props.q || 1;

    const errors: string[] = [];

    if (description.length === 0) {
      errors.push("No description provided");
    }

    if (quantity < 1) {
      errors.push("Cannot have less than one item");
    }

    if (errors.length > 0) {
      alert(`Failed to save item:\n${  errors.join("\n")}`);
    } else {
      this.props.handleItemChange(this.props, {
        d: description,
        h: hidden,
        l: locked,
        n: this.props.n,
        q: quantity
      });
    }
  }
}

export default UserItemEditor;
