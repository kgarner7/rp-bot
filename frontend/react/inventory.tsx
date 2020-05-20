import React from "react";

import { Responsive, Layout } from "react-grid-layout";
import Modal from "./modal";
import SearchBar from "./search";
import { compareString } from "./rooms";

import { MinimalItem } from "../../socket/helpers";

interface ItemProps {
  description: string;
  locked?: boolean;
  name: string;
  quantity?: number;

  toggle(title: string, body: string): void;
}

function Item(props: ItemProps): JSX.Element {
  const message = `${props.name} (${props.quantity || 1}${props.locked ? " locked": ""})`
  return (
    <div className="card item">
      <div className="card-body">
        <h5 className="card-title">{message}</h5>
        <button type="button" className="close" onClick={() => props.toggle(message, props.description)}>
          <span>^</span>
        </button>
        <p className="card-text item" dangerouslySetInnerHTML={{ __html: props.description}}></p>
      </div>
    </div>
  );
}

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
  name: string;
  inventory: MinimalItem[];
  selected: boolean;
  sidebar: boolean;
  width: number;
}

interface InventoryState {
  cols: number;
  modal: {
    body: string;
    title: string;
  };
  filter: string;
  sizes: LayoutMap;
  sort: InventorySortPossibilities;
}

type LayoutMap = Map<string, [number, number]>;

class Inventory extends React.Component<InventoryProps, InventoryState> {
  public constructor(props: InventoryProps) {
    super(props);

    this.state = {
      cols: 12,
      modal: {
        body: "",
        title: ""
      },
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
  
  private handleFilter(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ filter: event.target.value });
  }

  private toggleModal(title: string, body: string) {
    this.setState({
      modal: { body, title }
    });

    $(`#${this.props.name}Modal`).modal("show");
  }

  private handleSort(sort: InventorySortPossibilities) {
    if (sort !== this.state.sort) {
      this.setState({ sort });
    }
  }

  private handleLayout(layout: ReactGridLayout.Layout[]) {
    if (layout.length === 0) {
      return;
    }
    
    const currentMap = this.state.sizes;
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
      this.setState({ sizes: layoutMap })
    }
  }

  private handleWidth(_width: number, _margin: [number, number], cols: number) {
    if (cols !== this.state.cols) {
      this.setState({ cols });
    }
  }

  public render() {
    const layout: Layout[] = [];
    const width = this.props.width - (this.props.sidebar ? 200 : 0);
    let x = 0;
    
    const filtered = this.props.inventory.filter(item => {
      return !item.h &&
        (this.state.filter === "" || item.n.startsWith(this.state.filter));
    });

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
        x: x,
        y: 0,
        w: width,
        h: height
      });

      x = (x + 4) % this.state.cols;

      return (
        <div key={name}>
          <Item
            name={name}
            description={item.d}
            quantity={item.q}
            toggle={this.toggleModal}
            locked={item.l}
          />
        </div>
      )
    });

    const layouts: ReactGridLayout.Layouts = {};

    for (const key of sizes) {
      layouts[key] = layout;
    }

    const className = this.props.selected ? "visible": "invisible";
    
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
        <Responsive className="layout" rowHeight={50} width={width} layouts={layouts} onLayoutChange={this.handleLayout} onWidthChange={this.handleWidth}>
          {elements}
        </Responsive>
        <Modal id={this.props.name} title={this.state.modal.title} body={this.state.modal.body} html={true} />
      </div>
    );
  }
}

export default Inventory;