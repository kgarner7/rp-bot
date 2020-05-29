import React from "react";

import { SelectionState } from "./maps";

const STATE_OPTIONS = 3;

// eslint-disable-next-line @typescript-eslint/no-type-alias, @typescript-eslint/no-explicit-any
export type JQueryClickEvent = JQuery.ClickEvent<any, any, HTMLElement, HTMLElement>;

export interface AdminSelectionProps {
  mode?: SelectionState;

  createLink(event: JQueryClickEvent): void;
  handleChange(newState: SelectionState): void;
  showNode(event: JQueryClickEvent): void;
}

export class AdminSelection extends React.PureComponent<AdminSelectionProps> {
  public constructor(props: AdminSelectionProps) {
    super(props);

    this.state = {
      mode: SelectionState.NO_INTERACTION
    };

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  public componentDidUpdate(oldProps: AdminSelectionProps): void {
    if (this.props.mode !== oldProps.mode) {
      if (oldProps.mode === SelectionState.VIEW_ROOMS) {
        $(document).off("click", ".node", this.props.showNode);
      } else if (oldProps.mode === SelectionState.LINK_ROOMS) {
        $(document).off("click", ".node", this.props.createLink);
      }

      if (this.props.mode === SelectionState.VIEW_ROOMS) {
        $(document).on("click", ".node", this.props.showNode);
      } else if (this.props.mode === SelectionState.LINK_ROOMS) {
        $(document).on("click", ".node", this.props.createLink);
      }
    }
  }

  public render(): JSX.Element {
    const classNames: string[] = [];

    for (let idx = 0; idx < STATE_OPTIONS; idx++) {
      let name = "btn btn-primary col-4";

      if (this.props.mode === idx) {
        name += " active";
      }

      classNames.push(name);
    }

    return <div className="btn-group btn-group-toggle col-12">
      <label
        className={classNames[0]}
        id="noInt"
        onClick={this.handleVisibilityChange}
      >
        <input type="radio" name="v"/>
        No interaction
      </label>
      <label
        className={classNames[1]}
        id="viewR"
        onClick={this.handleVisibilityChange}
      >
        <input type="radio" name="v"/>
        Click on a room to view links
      </label>
      <label
        className={classNames[2]}
        id="editL"
        onClick={this.handleVisibilityChange}
      >
        <input type="radio" name="v"/>
        Click on two rooms to make links
      </label>
    </div>;
  }

  private handleVisibilityChange(event: React.MouseEvent<HTMLLabelElement, MouseEvent>): void {
    if (event.currentTarget) {
      let newMode: SelectionState;

      switch(event.currentTarget.id) {
        case "viewR": newMode = SelectionState.VIEW_ROOMS; break;
        case "editL": newMode = SelectionState.LINK_ROOMS; break;
        default: newMode = SelectionState.NO_INTERACTION;
      }

      this.props.handleChange(newMode);
    }
  }
}

export default AdminSelection;
