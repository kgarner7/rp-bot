import { Component } from "react";
import { compareString } from "./rooms";
import Select from "react-select"
import Inventory from "./inventory";

const style = {
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? "#00bc8c" : "white",
    borderBottom: "1px solid black",
    color: "black",
    padding: 10,
  })
}

class CurrentRooms extends Component {
  constructor(props) {
    super(props);
    this.state = {
      roomId: undefined
    };

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(value) {
    this.setState({ roomId: value.value });
  }

  render() {
    const options = Array.from(this.props.rooms.entries())
      .filter(room => room[1].present)
      .sort((a, b) => compareString(a[1].name, b[1].name, 1))
      .map(room => ({
        label: room[1].name,
        value: room[0],
      }));

    const className = this.props.selected ? "visible": "invisible";
    const room = this.props.rooms.get(this.state.roomId);
    let inventory = [];

    if (room) {
      inventory = room.inventory;
    }
    
    return (<div className={className}>
      <Select options={options} onChange={this.handleChange} styles={style} className="col-12"/>
      <Inventory inventory={inventory} name="room" selected={true} sidebar={this.props.sidebar} width={this.props.width}/>

    </div>);
  }
}

export default CurrentRooms;