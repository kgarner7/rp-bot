import React, { Component} from "react";

class Item extends Component {
  render() {
    return (
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">{ this.props.name }</h5>
          <p class="card-text">{ this.props.description }</p>
        </div>
      </div>
    );
  }
}

class Inventory extends Component {
  render() {
    if (!this.props.selected) return null;

    const elements = Object.entries(this.props.inventory)
      .map(item => {
        return <Item name={item[0]} description={item[1].description}/>
      });

    return (<div class="card-columns ml-2 mr-2">
      {elements}
    </div>);
  }
}

export default Inventory;