/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";
import Select, { StylesConfig} from "react-select";

import { MinimalItem } from "../../../socket/helpers";
import Inventory from "../inventory/inventory";
import { compareString } from "../util/util";

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
    padding: 10
  })
};

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

export interface CurrentRoomsState {
  roomId?: string;
}

export class CurrentRooms extends React.Component<CurrentRoomsProps, CurrentRoomsState> {
  public constructor(props: CurrentRoomsProps) {
    super(props);
    this.state = {
      roomId: undefined
    };

    this.handleChange = this.handleChange.bind(this);
  }

  public render(): JSX.Element {
    const options = Array.from(this.props.rooms.entries())
      .filter(entry => entry[1].present)
      .sort((a, b) => compareString(a[1].name, b[1].name, 1))
      .map(entry => ({
        label: entry[1].name,
        value: entry[0]
      }));

    const room = this.props.rooms.get(this.state.roomId || "");

    const className = this.props.selected ? "visible": "invisible";

    return <div className={ className }>
      <Select options={options} onChange={this.handleChange} styles={style} className="col-12"/>
      <Inventory
        inventory={room?.inventory || []}
        name="room" selected={ true }
        sidebar={this.props.sidebar}
        width={this.props.width}
      />
    </div>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleChange(value: any): void {
    this.setState({ roomId: value.value });
  }
}

export default CurrentRooms;
