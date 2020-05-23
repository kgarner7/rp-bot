/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";
import { Responsive, Layout } from "react-grid-layout";

import SearchBar from "../util/search";
import { compareString } from "../util/util";

import Room from "./room";
import RoomModal, { RoomData } from "./roomModal";

enum RoomSortOptions {
  NONE = "none",
  NEWEST_MESSAGES = "ztoa-t",
  OLDEST_MESSAGES = "atoz-t",
  ALPHA_INC_SECTION = "atoz-s",
  ALPHA_DEC_SECTION = "ztoa-s",
  ALPHA_INC_ROOM = "atoz-r",
  ALPHA_DEC_ROOM = "ztoa-r"
}

const options: Array<[RoomSortOptions, string]> = [
  [RoomSortOptions.NONE, "none"],
  [RoomSortOptions.NEWEST_MESSAGES, "Recent messages"],
  [RoomSortOptions.OLDEST_MESSAGES, "Older messages"],
  [RoomSortOptions.ALPHA_INC_SECTION, "A to Z (by section)"],
  [RoomSortOptions.ALPHA_DEC_SECTION, "Z to A (by section)"],
  [RoomSortOptions.ALPHA_INC_ROOM, "A to Z (by room)"],
  [RoomSortOptions.ALPHA_DEC_ROOM, "Z to A (by room)"]
];

const sizes = ["lg", "md", "sm", "xs", "xxs"];
const cols = { lg: 12, md: 10, sm: 6, xs: 6, xxs: 6 };

function escapeRegex(input: string): string {
  return input.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function generateRegex(rule: string): RegExp {
  return new RegExp(`^${rule.split("*").map(escapeRegex)
    .join(".*")}.*`);
}

export interface RoomsProps {
  rooms: Map<string, RoomData>;
  selected: boolean;
  sidebar: boolean;
  width: number;
  username: string;

  getLogs(roomId: string): void;
}

export interface RoomsState {
  cols: number;
  filter: string;
  roomId?: string;
  sizes: LayoutMap;
  sort: RoomSortOptions;
}

// eslint-disable-next-line @typescript-eslint/no-type-alias
type LayoutMap = Map<string, [number, number]>;

class Rooms extends React.PureComponent<RoomsProps, RoomsState> {
  public constructor(props: RoomsProps) {
    super(props);

    this.state = {
      cols: 12,
      filter: "",
      roomId: undefined,
      sizes: new Map(),
      sort: RoomSortOptions.NEWEST_MESSAGES
    };

    this.handleFilter = this.handleFilter.bind(this);
    this.handleLayout = this.handleLayout.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.handleWidth = this.handleWidth.bind(this);
  }

  public render(): JSX.Element {
    const layout: Layout[] = [];
    const width = this.props.width - (this.props.sidebar ? 200 : 0);
    let x = 0, y = 0;

    let rooms = Array.from(this.props.rooms.entries());
    const sort = this.state.sort;

    if (this.state.filter !== "") {
      const filterRules = this.state.filter.split(",")
        .filter(rule => rule.replace("s:", "").length > 0)
        .map(generateRegex);

      rooms = rooms.filter(room => {
        for (const rule of filterRules) {

          if (rule.test(room[1].name) || rule.test(`s:${  room[1].section}`)) {
            return true;
          }
        }
        return false;
      });
    }

    if (sort !== RoomSortOptions.NONE) {
      const sign = sort.startsWith("atoz") ? 1: -1;

      rooms = rooms.sort((first, second) => {
        const a = first[1], b = second[1];

        if (sort.endsWith("-s")) {
          return compareString(a.section, b.section, sign);
        } else if (sort.endsWith("-r")) {
          return compareString(a.name, b.name, sign);
        } else {
          return compareString(a.updatedAt, b.updatedAt, sign);
        }
      });
    }

    const elements = rooms.map(room => {
      const name = room[1].name;
      let elemHeight = 4, elemWidth = 6;

      if (this.state.sizes.has(name)) {
        const elem = this.state.sizes.get(name)!;

        elemWidth = elem[0];
        elemHeight = elem[1];
      }

      layout.push({
        i: name,
        x,
        y,
        w: elemWidth,
        h: elemHeight
      });

      x += 6;

      if (x >= this.state.cols) {
        x = 0;
        y++;
      }

      return (
        <div key={name}>
          <Room
            archive={room[1].archive}
            id={room[0]}
            section={room[1].section}
            description={room[1].description}
            name={name}
            messages={room[1].messages}
            username={this.props.username}
            toggleModal={this.toggleModal}
          />
        </div>
      );
    });

    const layouts: ReactGridLayout.Layouts = {};

    for (const key of sizes) {
      layouts[key] = layout;
    }

    const className = this.props.selected ? "visible": "invisible";

    return (
      <div className={className}>
        <SearchBar<RoomSortOptions>
          filter={this.state.filter}
          handleFilter={this.handleFilter}
          options={options}
          handleSort={this.handleSort}
          placeholder="a room name, sector (s:), wildcard (*), or list (comma separated)"
          name="rooms"
        />
        <Responsive
          className="layout rooms"
          rowHeight={60}
          width={width}
          layouts={layouts}
          onLayoutChange={this.handleLayout}
          onWidthChange={this.handleWidth}
          cols={cols}
        >
          {elements}
        </Responsive>
        <RoomModal
          getLogs={this.props.getLogs}
          roomId={this.state.roomId || ""}
          rooms={this.props.rooms}
          username={this.props.username}
        />
      </div>
    );
  }

  private handleFilter(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ filter: event.target.value });
  }

  private handleLayout(layout: ReactGridLayout.Layout[]): void {
    if (layout.length === 0) {
      return;
    }

    this.setState(state => {
      const currentMap = state.sizes;
      const layoutMap = new Map();

      let changed = false;

      for (const item of layout) {
        const currentLayout = currentMap.get(item.i);
        const layoutChange = currentLayout === undefined
          || currentLayout[0] !== item.w
          || currentLayout[1] !== item.h;

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

  private toggleModal(roomId: string): void {
    this.setState({ roomId });
    $("#roomsModal").modal("show");
  }

  private handleSort(sort: RoomSortOptions): void {
    this.setState({ sort });
  }

  private handleWidth(_width: number, _margin: [number, number], columns: number): void {
    if (columns !== this.state.cols) {
      this.setState({ cols: columns });
    }
  }
}

export default Rooms;
