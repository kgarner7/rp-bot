import React, { MouseEventHandler } from "react";
import { VisibleStates } from "./app";

interface GroupProps {
  name: string;
  onClick: MouseEventHandler;
}

class Group extends React.Component<GroupProps> {
  public constructor(props: GroupProps) {
    super(props);
  }

  public render() {
    return <a 
      href="#" 
      className="list-group-item list-group-item-action"
      onClick={ this.props.onClick }>{ this.props.name }</a>
  }
}

interface SidebarProps {
  admin: boolean;
  adminOps: VisibleStates[];
  options: VisibleStates[];

  handleSelect(value: string): void;
}

interface SidebarState {
  selected?: VisibleStates;
}

class Sidebar extends React.Component<SidebarProps, SidebarState> {
  public constructor(props: SidebarProps) {
    super(props);
  }

  private handleSelect(value: VisibleStates) {
    this.setState(() => ({
      selected: value
    }));

    this.props.handleSelect(value);
  }

  render(){
    const options = this.props.options;

    if (this.props.admin) {
      options.concat(this.props.adminOps);
    }

    const items = options.map(value => {
      return <Group key={value} name={value} onClick={() => this.handleSelect(value)}/>
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
}

export default Sidebar;