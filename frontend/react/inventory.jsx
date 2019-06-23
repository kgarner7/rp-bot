import { Component} from "react";
import { Responsive } from "react-grid-layout";
import Modal from "./modal";
import SearchBar from "./search";
import { compareString } from "./rooms";

class Item extends Component {
  render() {
    const message = `${this.props.name} (${this.props.quantity || 1}${this.props.locked ? " locked": ""})`
    return (
      <div className="card item">
        <div className="card-body">
          <h5 className="card-title">{message}</h5>
          <button type="button" className="close" onClick={() => this.props.toggle(message, this.props.description)}>
            <span>^</span>
          </button>
          <p className="card-text item" dangerouslySetInnerHTML={{ __html: this.props.description}}></p>
        </div>
      </div>
    );
  }
}

const sizes = ["lg", "md", "sm", "xs"];
const options = [["none", "No sorting"], ["atoz", "A to Z"], ["ztoa", "Z to A"]];

class Inventory extends Component {
  constructor(props) {
    super(props);

    this.state = {
      cols: 12,
      modal: {
        body: "",
        title: ""
      },
      filter: "",
      sizes: new Map(),
      sort: "none"
    };

    this.handleFilter = this.handleFilter.bind(this);
    this.handleLayout = this.handleLayout.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handleWidth = this.handleWidth.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
  }
  
  handleFilter(event) {
    this.setState({ filter: event.target.value });
  }

  toggleModal(title, body) {
    this.setState({
      modal: { body, title }
    });

    $(`#${this.props.name}Modal`).modal("show");
  }

  handleSort(sort) {
    if (sort !== this.state.sort) {
      this.setState({ sort });
    }
  }

  handleLayout(layout) {
    if (layout.length === 0) {
      return;
    }

    const currentMap = this.state.sizes,
    layoutMap = new Map();

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

  handleWidth(_width, _margin, cols) {
    if (cols !== this.state.cols) {
      this.setState({ cols });
    }
  }

  render() {
    const layout = [],
      width = this.props.width - (this.props.sidebar ? 200 : 0);
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
        const elem = this.state.sizes.get(name);

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
          <Item name={name} description={item.d} quantity={item.q} toggle={this.toggleModal}/>
        </div>
      )
    });

    const layouts = {};

    for (const key of sizes) {
      layouts[key] = layout;
    }

    const className = this.props.selected ? "visible": "invisible";
    
    return (
      <div className={className}>
        <SearchBar filter={this.state.filter} handleFilter={this.handleFilter} options={options} handleSort={this.handleSort} placeholder={"select an item"} name={this.props.name}/>
        <Responsive className="layout" rowHeight={50} width={width} layouts={layouts} onLayoutChange={this.handleLayout} onWidthChange={this.handleWidth}>
          {elements}
        </Responsive>
        <Modal id={this.props.name} title={this.state.modal.title} body={this.state.modal.body} html={true} />
      </div>
    );
  }
}

export default Inventory;