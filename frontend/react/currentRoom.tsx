import React from "react";
import { compareString } from "./rooms";
import Select, { StylesConfig} from "react-select"
import Inventory from "./inventory";
import { MinimalItem } from "../../socket/helpers";

const style: StylesConfig = {
  menu: (provided, _state) => ({
    ...provided,
    "z-index": 5
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? "#00bc8c" : "white",
    borderBottom: "1px solid black",
    color: "black",
    padding: 10,
  })
}

export interface RoomData {
  inventory: MinimalItem[];
  name: string;
  present: boolean;
  updatedAt?: number;
}

interface CurrentRoomsProps {
  rooms: Map<string, RoomData>;
  selected: boolean;
  sidebar: boolean;
  width: number;
}

interface CurrentRoomsState {
  roomId?: string;
}

class CurrentRooms extends React.Component<CurrentRoomsProps, CurrentRoomsState> {
  public constructor(props: CurrentRoomsProps) {
    super(props);
    this.state = {
      roomId: undefined
    };

    this.handleChange = this.handleChange.bind(this);
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
    const room = this.props.rooms.get(this.state.roomId || "");

    return (<div className={className}>
      <Select options={options} onChange={this.handleChange} styles={style} className="col-12"/>
      <Inventory inventory={room?.inventory || []} name="room" selected={true} sidebar={this.props.sidebar} width={this.props.width}/>

    </div>);
  }

  private handleChange(value: any) {
    this.setState({ roomId: value.value });
  }
}

export default CurrentRooms;