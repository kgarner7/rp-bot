import React, { MouseEventHandler } from "react";

import { VisibleStates } from "./util";

interface GroupProps {
  name: string;
  onClick: MouseEventHandler;
}

const Group = React.memo(function Group(props: GroupProps)  {
  return <a
    href="#"
    className="list-group-item list-group-item-action"
    onClick={ props.onClick }>{ props.name }</a>;
});

interface SidebarProps {
  admin: boolean;
  adminOps: VisibleStates[];
  options: VisibleStates[];

  handleSelect(value: string): void;
}

interface SidebarState {
  selected?: VisibleStates;
}

class Sidebar extends React.PureComponent<SidebarProps, SidebarState> {
  public render(): JSX.Element {
    let options = this.props.options;

    if (this.props.admin) {
      options = options.concat(this.props.adminOps);
    }

    const items = options.map(value => {
      return <Group key={value} name={value} onClick={(): void => this.handleSelect(value)}/>;
    });

    return(
      <div className="bg-light border-right" id="sidebar-wrapper">
        <div className="sidebar-heading">Discordo-chan</div>
        <div className="list-group list-group-flush">
          {items}
        </div>
      </div>
    );
  }

  private handleSelect(value: VisibleStates): void {
    this.setState(() => ({
      selected: value
    }));

    this.props.handleSelect(value);
  }
}

export default Sidebar;
