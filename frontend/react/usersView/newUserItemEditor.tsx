/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";

import { MinimalItem } from "../../../socket/helpers/rooms";

interface NewUserItemEditorProps {
  itemCount?: number;

  cancelEdit(): void;
  handleItemChange(oldItem: MinimalItem | undefined, newItem: MinimalItem | undefined): void;
}

export class NewUserItemEditor extends React.PureComponent<NewUserItemEditorProps, MinimalItem> {
  public constructor(props: NewUserItemEditorProps) {
    super(props);

    this.state = {
      d: "",
      n: ""
    };

    this.handleCancel = this.handleCancel.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }

  public componentDidUpdate(oldProps: NewUserItemEditorProps): void {
    if (oldProps.itemCount !== this.props.itemCount) {
      this.setState({
        d: "",
        h: undefined,
        l: undefined,
        n: "",
        q: 1
      });
    }
  }

  public render(): JSX.Element {
    const valid = this.state.d.length > 0
      && (this.state.q || 1) > 0
      && this.state.n.length > 0;

    return <li className="list-group-item">
      <div className="input-group">
        <input
          placeholder="Item name"
          type="text"
          className="form-control"
          name="n"
          value={ this.state.n }
          onChange={ this.handleChange }
        />
        <input
          placeholder="Item quantity"
          type="number"
          className="form-control"
          name="q"
          value={ this.state.q }
          onChange={ this.handleChange }
          min={1}
        />
        <div className="input-group-append">
          <span className="input-group-text">
            <input
              type="checkbox"
              name="h"
              checked={ this.state.h }
              onChange={ this.handleChange }
            /> Hidden
          </span>
          <span className="input-group-text">
            <input
              type="checkbox"
              name="l"
              checked={ this.state.l }
              onChange={ this.handleChange }
            /> Locked
          </span>
        </div>
      </div>
      <div className="input-group input-group-sm">
        <textarea
          placeholder="Description"
          className="form-control"
          value={ this.state.d }
          name="d"
          rows={2}
          onChange={ this.handleChange }
        />
        <div className="input-group-append">
          <button
            hidden={ !valid }
            className="btn btn-outline-success"
            type="button"
            onClick={ this.handleSave }
          >
            Save
          </button>
          <button
            className="btn btn-outline-warning"
            type="button"
            onClick={ this.handleCancel }
          >
            Cancel
          </button>
        </div>
      </div>
    </li>;
  }

  private handleCancel(): void {
    this.props.cancelEdit();
  }

  private handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    const name = event.target.name as keyof MinimalItem;

    switch (name) {
      case "d":
      case "n": {
        this.setState({
          [name as "d"]: event.target.value
        });
        break;
      }
      case "h":
      case "l": {
        this.setState({
          [name as "h"]: (event as React.ChangeEvent<HTMLInputElement>).target.checked
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

  private handleSave(): void {
    const errors: string[] = [];

    if (this.state.d.length === 0) {
      errors.push("No description provided");
    }

    if ((this.state.q || 1) < 1) {
      errors.push("Cannot have less than one item");
    }

    if (errors.length > 0) {
      alert(`Failed to save item:\n${  errors.join("\n")}`);
    } else {
      this.props.handleItemChange(undefined, this.state);
    }
  }
}

export default NewUserItemEditor;
