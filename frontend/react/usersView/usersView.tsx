/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";
import { Responsive, Layout } from "react-grid-layout";

import { USER_ITEM_CHANGE } from "../../../socket/consts";
import { UserInfo, MinimalItem, UserItemChange } from "../../../socket/helpers";
import Modal from "../util/modal";

import NewUserItemEditor from "./newUserItemEditor";
import User from "./user";
import UserItemEditor from "./userItemEditor";

// eslint-disable-next-line @typescript-eslint/no-type-alias
type LayoutMap = Map<string, [number, number]>;

const sizes = ["lg", "md", "sm", "xs"];

export interface UsersViewProps {
  selected: boolean;
  sidebar: boolean;
  socket: SocketIOClient.Socket;
  users?: UserInfo[];
  width: number;
}

export interface UsersViewState {
  activeUser?: string;
  cols: number;
  editing: boolean;
  filter: string;
  sizes: LayoutMap;
}

class UsersView extends React.Component<UsersViewProps, UsersViewState> {
  public constructor(props: UsersViewProps) {
    super(props);

    this.state = {
      cols: 12,
      editing: false,
      filter: "",
      sizes: new Map()
    };

    this.handleCancelEdit = this.handleCancelEdit.bind(this);
    this.handleItemChange = this.handleItemChange.bind(this);
    this.handleLayout = this.handleLayout.bind(this);
    this.handleNewItem = this.handleNewItem.bind(this);
    this.handleWidth = this.handleWidth.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
  }

  public render(): JSX.Element {
    const layout: Layout[] = [];
    const width = this.props.width - (this.props.sidebar ? 200 : 0);

    let x = 0;

    const elements = (this.props.users || []).map(user => {
      const name = user.n;

      let height = 3, width = 4;

      if (this.state.sizes.has(name)) {
        const elem = this.state.sizes.get(name) as [number, number];

        width = elem[0];
        height = elem[1];
      }

      layout.push({
        i: name,
        x,
        y: 0,
        w: width,
        h: height
      });

      x = (x + 4) % this.state.cols;

      return <div key={user.n}>
        <User {...user} toggleModal={ this.toggleModal }/>
      </div>;
    });

    const layouts: ReactGridLayout.Layouts = {};

    for (const key of sizes) {
      layouts[key] = layout;
    }

    const className = this.props.selected ? "visible": "invisible";

    let items: JSX.Element[] = [];
    let title = "";

    if (this.state.activeUser && this.props.users) {
      for (const user of this.props.users) {
        if (user.n === this.state.activeUser) {
          title = `Editing ${user.n}`;

          items = user.i.map(item =>
            <UserItemEditor
              key={ item.n }
              handleItemChange={this.handleItemChange}
              {...item} />
          );
        }
      }
    }

    let body: JSX.Element;

    if (this.state.editing) {
      body = <NewUserItemEditor
        cancelEdit={ this.handleCancelEdit }
        handleItemChange={ this.handleItemChange }
      />;
    } else {
      body = <button type="button" className="btn btn-primary" onClick={ this.handleNewItem }>
        Add a new item
      </button>;
    }

    return <div className={ className }>
      <Responsive
        className="layout"
        rowHeight={100}
        width={width}
        layouts={layouts}
        onLayoutChange={this.handleLayout}
        onWidthChange={this.handleWidth}
      >
        {elements}
      </Responsive>
      <Modal
        body={
          <ul className="list-group">
            { items }
            { body }
          </ul>
        }
        id="viewUser"
        title={ title }
      />
    </div>;
  }

  private handleCancelEdit(): void {
    this.setState({
      editing: false
    });
  }

  private handleItemChange(oldItem: MinimalItem | undefined,
                           newItem: MinimalItem | undefined): void {

    if (oldItem === undefined) {
      this.setState({
        editing: false
      });
    }

    const data: UserItemChange = {
      n: newItem,
      o: oldItem,
      u: this.state.activeUser || ""
    };

    this.props.socket.emit(USER_ITEM_CHANGE, data);
  }

  private handleLayout(layout: ReactGridLayout.Layout[]): void {
    if (layout.length === 0) {
      return;
    }

    this.setState(state => {
      const currentMap = state.sizes;
      const layoutMap: LayoutMap = new Map();

      let changed = false;

      for(const item of layout) {
        const currentLayout = currentMap.get(item.i),
          layoutChange = currentLayout === undefined ||
            currentLayout[0] !== item.w || currentLayout[1] !== item.h;

        if (layoutChange) {
          layoutMap.set(item.i, [item.w, item.h]);
          changed = true;
        }
      }

      if (changed) {
        return { sizes: layoutMap };
      } else {
        return { sizes: currentMap };
      }
    });
  }

  private handleNewItem(): void {
    this.setState({
      editing: true
    });
  }

  private handleWidth(_width: number, _margin: [number, number], cols: number): void {
    if (cols !== this.state.cols) {
      this.setState({ cols });
    }
  }

  private toggleModal(activeUser: string): void {
    this.setState({
      activeUser
    });

    $("#viewUserModal").modal("show");
  }
}

export default UsersView;
