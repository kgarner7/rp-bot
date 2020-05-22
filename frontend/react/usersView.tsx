import React from "react";
import { Responsive, Layout } from "react-grid-layout";

import { UserInfo, MinimalItem, UserItemChange } from "../../socket/helpers";
import Modal from "./modal";
import { USER_ITEM_CHANGE } from "../../socket/consts";

type LayoutMap = Map<string, [number, number]>;

const sizes = ["lg", "md", "sm", "xs"];

interface UserProps extends UserInfo {
  toggleModal(username: string): void;
}

const User = React.memo((props: UserProps) => {
  let header = props.n;

  if (props.l) {
    header += ` (in ${props.l})`;
  }

  const items = props.i.map(item => {
    let itemString = `${item.n} (${item.q || 1}): ${item.d}`;

    if (item.l) {
      itemString += " (hidden)";
    }
    
    return <li key={ item.n }>{ itemString }</li>;
  })

  return <div className="card item">
    <div className="card-body">
      <h5 className="card-title">{header}</h5>
      <button type="button" className="close" onClick={ () => props.toggleModal(props.n)}>
        <span>^</span>
      </button>
      <p className="card-text item">
        <ul>
          { items }
        </ul>
      </p>
    </div>
  </div>
});

interface UserItemEditorProps extends MinimalItem {
  handleItemChange(oldItem: MinimalItem, newItem: MinimalItem): void;
}

interface UserItemEditorState {
  d?: string;
  h?: boolean;
  l?: boolean;
  q?: number;
}

class UserItemEditor extends React.PureComponent<UserItemEditorProps, UserItemEditorState> {  
  public constructor(props: UserItemEditorProps) {
    super(props);

    this.state = {};

    this.handleCancel = this.handleCancel.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
  }

  public componentDidUpdate(prevProps: MinimalItem) {
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
      || (hidden && !this.props.h)
      || (locked && !this.props.l)
      || (this.props.q ? quantity !== this.props.q: quantity !== 1);

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

  private handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const name = event.target.name as keyof UserItemEditorState;

    switch (name) {
      case "d": {
        this.setState({
          [name]: event.target.value
        })
        break;
      }
      case "h":
      case "l": {
        this.setState({
          [name]: (event as React.ChangeEvent<HTMLInputElement>).target.checked
        })
        break;
      }
      case "q": {
        console.log(event);
        this.setState({
          q: (event as React.ChangeEvent<HTMLInputElement>).target.valueAsNumber
        });
        break;
      }
    }
  }

  private handleSave(): void {
    const description = this.state.d !== undefined ? this.state.d: this.props.d;
    const hidden = this.state.h !== undefined ? this.state.h: this.props.h;
    const locked = this.state.l !== undefined ? this.state.l: this.props.l;
    const quantity = this.state.q || this.props.q || 1;

    let errors: string[] = [];

    if (description.length === 0) {
      errors.push("No description provided")
    }

    if (quantity < 1) {
      errors.push("Cannot have less than one item")
    }

    if (errors.length > 0) {
      alert("Failed to save item:\n" + errors.join("\n"))
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
  filter: string;
  sizes: LayoutMap;
}

class UsersView extends React.Component<UsersViewProps, UsersViewState> {
  public constructor(props: UsersViewProps) {
    super(props);

    this.state = {
      cols: 12,
      filter: "",
      sizes: new Map()
    };

    this.handleItemChange = this.handleItemChange.bind(this);
    this.handleLayout = this.handleLayout.bind(this);
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
        x: x,
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
        body={<ul className="list-group">{ items }</ul>}
        id="viewUser"
        title={ title }
      />
    </div>;
  }

  private handleItemChange(oldItem: MinimalItem, newItem: MinimalItem) {
    const data: UserItemChange = {
      n: newItem,
      o: oldItem,
      u: this.state.activeUser || ""
    }

    this.props.socket.emit(USER_ITEM_CHANGE, data);
  }

  private handleLayout(layout: ReactGridLayout.Layout[]) {
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
    })
  }

  private handleWidth(_width: number, _margin: [number, number], cols: number) {
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