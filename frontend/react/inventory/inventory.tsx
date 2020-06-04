/* eslint-disable @typescript-eslint/unbound-method */
import loadable from "@loadable/component";
import React from "react";
import { Responsive, Layout } from "react-grid-layout";

import { MinimalItem } from "../../../socket/helpers/rooms";
import Modal from "../util/modal";
import SearchBar from "../util/search";
import { compareString, calculateWidth } from "../util/util";

import Item from "./item";

const UserItemEditor = loadable(() =>
  import(/* webpackChunkName: "itemEditor" */ "../usersView/userItemEditor"));

enum InventorySortPossibilities {
  NONE = "none",
  ALPHABETICAL_INCREASING = "atoz",
  ALPHABETICAL_DECREASING = "ztoa"
}

const sizes = ["lg", "md", "sm", "xs"];
const options: Array<[InventorySortPossibilities, string]> = [
  [InventorySortPossibilities.NONE, "No sorting"],
  [InventorySortPossibilities.ALPHABETICAL_INCREASING, "A to Z"],
  [InventorySortPossibilities.ALPHABETICAL_DECREASING, "Z to A"]
];

interface InventoryProps {
  edit?: boolean;
  html?: boolean;
  name: string;
  inventory: MinimalItem[];
  selected: boolean;
  sidebar: boolean;
  width: number;

  handleItemChange?(oldItem: MinimalItem | undefined, newItem: MinimalItem | undefined): void;
}

interface InventoryState {
  activeItem?: string;
  cols: number;
  filter: string;
  sizes: LayoutMap;
  sort: InventorySortPossibilities;
}

// eslint-disable-next-line @typescript-eslint/no-type-alias
type LayoutMap = Map<string, [number, number]>;

class Inventory extends React.PureComponent<InventoryProps, InventoryState> {
  public constructor(props: InventoryProps) {
    super(props);

    this.state = {
      cols: 12,
      filter: "",
      sizes: new Map(),
      sort: InventorySortPossibilities.NONE
    };

    this.handleFilter = this.handleFilter.bind(this);
    this.handleLayout = this.handleLayout.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handleWidth = this.handleWidth.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
  }

  public componentDidUpdate(oldProps: InventoryProps): void {
    if (oldProps.inventory.length > this.props.inventory.length && this.state.activeItem) {
      for (const item of oldProps.inventory) {
        if (item.n === this.state.activeItem) {
          $(`#${this.props.name}Modal`).modal("hide");

          this.setState({
            activeItem: undefined
          });
        }
      }
    }
  }

  public render(): JSX.Element {
    const layout: Layout[] = [];
    const width = calculateWidth(this.props);
    let x = 0;

    const filtered = this.props.inventory.filter(item =>
      this.state.filter === "" || item.n.startsWith(this.state.filter));

    if (this.state.sort !== "none") {
      const sign = this.state.sort === "atoz" ? 1: -1;

      filtered.sort((a, b) => compareString(a.n, b.n, sign));
    }

    const elements = filtered.map(item => {
      const name = item.n;
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

      return (
        <div key={name}>
          <Item
            name={name}
            hidden={item.h}
            description={item.d}
            quantity={item.q}
            toggle={this.toggleModal}
            locked={item.l}
          />
        </div>
      );
    });

    const layouts: ReactGridLayout.Layouts = {};

    for (const key of sizes) {
      layouts[key] = layout;
    }

    const className = this.props.selected ? "visible": "invisible";

    let body: JSX.Element | string = "";
    let title = "";

    if (this.state.activeItem) {
      for (const item of this.props.inventory) {
        if (item.n === this.state.activeItem) {
          if (this.props.edit) {
            body = <UserItemEditor {...item} handleItemChange={this.props.handleItemChange!}/>;
            title = `Editing ${item.n}`;
          } else {
            body = item.d;
            title = `${item.n} (${item.q || 1}${item.l ? " locked": ""})`;
          }
        }
      }
    }

    return (
      <div className={className}>
        <SearchBar<InventorySortPossibilities>
          filter={this.state.filter}
          handleFilter={this.handleFilter}
          options={options}
          handleSort={this.handleSort}
          placeholder={"select an item"}
          name={this.props.name}
        />
        <Responsive
          className="layout mt-4"
          rowHeight={50}
          width={width}
          layouts={layouts}
          onLayoutChange={this.handleLayout}
          onWidthChange={this.handleWidth}
        >
          {elements}
        </Responsive>
        <Modal
          id={this.props.name}
          title={title}
          body={body}
          html={this.props.edit || this.props.html}
        />
      </div>
    );
  }

  private handleFilter(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ filter: event.target.value });
  }

  private toggleModal(activeItem: string): void {
    this.setState({
      activeItem
    });

    $(`#${this.props.name}Modal`).modal("show");
  }

  private handleSort(sort: InventorySortPossibilities): void {
    if (sort !== this.state.sort) {
      this.setState({ sort });
    }
  }

  private handleLayout(layout: ReactGridLayout.Layout[]): void {
    if (layout.length === 0) {
      this.setState({
        sizes: new Map()
      });

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

  private handleWidth(_width: number, _margin: [number, number], cols: number): void {
    if (cols !== this.state.cols) {
      this.setState({ cols });
    }
  }
}

export default Inventory;
