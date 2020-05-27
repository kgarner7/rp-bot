/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";
import Select, { StylesConfig} from "react-select";

import { ROOM_DESCRIPTION, ROOM_DELETE, ROOM_NAME, ROOM_ITEM_CHANGE } from "../../../socket/consts";
import { MinimalItem, RoomDescriptionChange, RoomItemChange, RoomVisibility } from "../../../socket/helpers";
import Inventory from "../inventory/inventory";
import NewUserItemEditor from "../usersView/newUserItemEditor";
import Modal from "../util/modal";
import { compareString } from "../util/util";

import { RoomCreate } from "./roomCreate";
import RoomDescription from "./roomDescription";
import RoomName from "./roomName";
import { RoomMetadata } from "./roomMetadata";

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
  description: string;
  history?: boolean;
  id: string;
  inventory: MinimalItem[];
  name: string;
  present: boolean;
  section: string;
  updatedAt?: number;
  visibility?: RoomVisibility;
}

export interface CurrentRoomsProps {
  admin: boolean;
  rooms: Map<string, RoomData>;
  selected: boolean;
  sidebar: boolean;
  socket: SocketIOClient.Socket;
  width: number;
}

export interface CurrentRoomsState {
  roomId?: string;
}

const EMPTY_LIST: MinimalItem[] = [];

export class CurrentRooms extends React.PureComponent<CurrentRoomsProps, CurrentRoomsState> {
  public constructor(props: CurrentRoomsProps) {
    super(props);
    this.state = {
      roomId: undefined
    };

    this.handleChange = this.handleChange.bind(this);
    this.delete = this.delete.bind(this);
    this.newDescription = this.newDescription.bind(this);
    this.newItem = this.newItem.bind(this);
    this.newName = this.newName.bind(this);
  }

  public componentDidUpdate(oldProps: CurrentRoomsProps): void {
    if (this.state.roomId) {
      if (!this.props.rooms.has(this.state.roomId)) {
        this.setState({
          roomId: undefined
        });
      } else {
        const thisRoom = this.props.rooms.get(this.state.roomId)!;
        const oldRoom = oldProps.rooms.get(this.state.roomId);

        if (oldRoom && thisRoom.inventory.length > oldRoom.inventory.length) {
          $("#itemCreateModal").modal("hide");
        }
      }
    }

    if (oldProps.rooms.size !== this.props.rooms.size) {
      $("#roomCreateModal").modal("hide");
    }
  }

  public render(): JSX.Element {
    let selected: { label: string; value: string } | null = null;

    const sections = new Set<string>();

    const options = Array.from(this.props.rooms.entries())
      .filter(entry => entry[1].present)
      .sort((a, b) => compareString(a[1].name, b[1].name, 1))
      .map(entry => {
        const value = {
          label: entry[1].name,
          value: entry[0]
        };

        if (entry[0] === this.state.roomId) {
          selected = value;
        }

        sections.add(entry[1].section);

        return value;
      });

    const className = this.props.selected ? "visible": "invisible";

    const room = this.props.rooms.get(selected === null ? "" : selected!.value);

    let begin: JSX.Element;

    if (this.props.admin) {
      begin = <div className="mb-4 row col-12">
        <Select
          options={options}
          onChange={this.handleChange}
          styles={style}
          className="col-lg-10 col-xs-8"
          value={selected}
        />
        <button
          className="col-lg-2 col-xs-4 btn btn-primary"
          onClick={CurrentRooms.toggleModal}
        >New room</button>
      </div>;
    } else {
      begin = <Select
        options={options}
        onChange={this.handleChange}
        styles={style}
        className="col-12 mb-4"
        value={selected}
      />;
    }

    return <div className={ className }>
      {begin}
      <div className={this.props.admin ? "col-12 row" : "col-12"}>
        { this.props.admin &&
          <RoomName
            room={room}
            newName={ this.newName }
          />
        }
        <RoomDescription
          admin={this.props.admin}
          delete={ this.delete }
          newDescription={this.newDescription}
          room={ room }
        />
      </div>
      <RoomMetadata
        admin={this.props.admin}
        room={room}
        socket={this.props.socket}
      />
      <Inventory
        edit={this.props.admin}
        handleItemChange={this.newItem}
        inventory={room?.inventory || EMPTY_LIST}
        name="room" selected={ true }
        sidebar={this.props.sidebar}
        width={this.props.width}
      />
      {this.props.admin &&
        <React.Fragment>
          <Modal
            body={<RoomCreate
              rooms={this.props.rooms.size}
              sections={Array.from(sections)}
              socket={this.props.socket}
            />}
            id="roomCreate"
            title="Create a new room"
          />
          <div className="mt-4 col-12">
            <button
              type="button"
              className="btn btn-primary col-12"
              onClick={CurrentRooms.toggleItem}
            >
              New item
            </button>
          </div>
          <Modal
            body={<NewUserItemEditor
              itemCount={room?.inventory.length || 0}
              cancelEdit={CurrentRooms.cancelItemEdit}
              handleItemChange={this.newItem}
            />}
            id="itemCreate"
            title="Create an item"
          />
        </React.Fragment>

      }
    </div>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleChange(value: any): void {
    this.setState({ roomId: value.value });
  }

  private delete(roomId: string): void {
    this.props.socket.emit(ROOM_DELETE, roomId);
  }

  private newDescription(id: string, old: string, newDesc: string): void {
    const data: RoomDescriptionChange = {
      n: newDesc,
      o: old,
      r: id
    };

    this.props.socket.emit(ROOM_DESCRIPTION, data);
  }

  private newItem(oldItem: MinimalItem | undefined, newItem: MinimalItem | undefined): void {
    if (this.state.roomId && this.props.rooms.has(this.state.roomId)) {
      const change: RoomItemChange = {
        n: newItem,
        o: oldItem,
        r: this.props.rooms.get(this.state.roomId)!.id
      };

      this.props.socket.emit(ROOM_ITEM_CHANGE, change);
    }
  }

  private newName(id: string, old: string, newName: string): void {
    const data: RoomDescriptionChange = {
      n: newName,
      o: old,
      r: id
    };

    this.props.socket.emit(ROOM_NAME, data);
  }

  private static cancelItemEdit(): void {
    $("#itemCreateModal").modal("hide");
  }

  private static toggleItem(): void {
    $("#itemCreateModal").modal("show");
  }

  private static toggleModal(): void {
    $("#roomCreateModal").modal("show");
  }
}

export default CurrentRooms;
