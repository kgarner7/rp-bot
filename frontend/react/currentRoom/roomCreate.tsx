/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";
import { BlockPicker, ColorResult, RGBColor } from "react-color";
// eslint-disable-next-line import/no-internal-modules
import { Styles } from "react-select";
import CreatableSelect from "react-select/creatable";

import { ROOM_CREATE } from "../../../socket/consts";
import { RoomCreation, RoomVisibility } from "../../../socket/helpers";

interface RoomCreateProps {
  rooms: number;
  sections: string[];
  socket: SocketIOClient.Socket;
}

interface RoomCreateState {
  color: RGBColor;
  description?: string;
  history?: boolean;
  name?: string;
  section?: string;
  showColor?: boolean;
  visibility?: RoomVisibility;
}

const DISCORD_COLORS = [
  "#1ABC9C", "#2ECC71", "#3498DB", "#9B59B6", "#E91E63",
  "#11806A", "#1F8B4C", "#206694", "#71368A", "#AD1457",
  "#F1C40F", "#E67E22", "#E74C3C", "#95A5A6", "#607D8B",
  "#C27C0E", "#A84300", "#992D22", "#979C9F", "#546E7A"
];

const DEFAULT_COLOR = {
  r: 52,
  g: 152,
  b: 182
};

const SELECT_STYLES: Partial<Styles> = {
  option: (provided, state) => ({
    ...provided,
    color: state.isSelected ? "black" : "blue"
  })
};

export class RoomCreate extends React.Component<RoomCreateProps, RoomCreateState> {
  public constructor(props: RoomCreateProps) {
    super(props);

    this.state = {
      color: DEFAULT_COLOR
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleChangeComplete = this.handleChangeComplete.bind(this);
    this.handleCreate = this.handleCreate.bind(this);
    this.handleColor = this.handleColor.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  public componentDidUpdate(oldProps: RoomCreateProps): void {
    if (this.props.rooms !== oldProps.rooms) {
      this.setState({
        color: DEFAULT_COLOR,
        description: undefined,
        name: undefined,
        section: undefined,
        showColor: false,
        visibility: undefined
      });
    }
  }

  public render(): JSX.Element {
    const sectionOptions = this.props.sections.map(section => ({
      label: section,
      value: section
    }));

    const currentSection = this.state.section ? {
      label: this.state.section,
      value: this.state.section
    }: undefined;

    const color = `rgb(${this.state.color.r},${this.state.color.g},${this.state.color.b})`;

    const valid = this.state.description
      && this.state.name
      && this.state.section
      && this.state.visibility;

    return <React.Fragment>
      <div className="input-group mb-4">
        <div className="input-group-prepend">
          <span className="input-group-text">Name and section</span>
        </div>
        <input
          className="form-control"
          onChange={ this.handleChange }
          name="n"
          placeholder="name"
          type="text"
          value={this.state.name}
        />
        <div className="input-group-btn btn-group-toggle" data-toggle="buttons">
          <label className="btn btn-primary" id="publicW" onClick={this.handleVisibilityChange}>
            <input type="radio" name="v"/>
            Publically writeable
          </label>
          <label className="btn btn-primary" id="publicR" onClick={this.handleVisibilityChange}>
            <input type="radio" name="v"/>
            Publically readable
          </label>
          <label className="btn btn-primary" id="private" onClick={this.handleVisibilityChange}>
            <input type="radio" name="v"/>
            Private
          </label>
        </div>
      </div>
      <div className="row mb-4">
        <CreatableSelect
          placeholder="Select or create section"
          className="col-8"
          isClearable
          onChange={this.handleSelectChange}
          options={sectionOptions}
          value={currentSection}
          styles={SELECT_STYLES}
        />
        <div className="col-4">
          <button
            className="btn col-12"
            onClick={this.handleColor}
            style={{ backgroundColor: color }}
          >Set color</button>
          { this.state.showColor && <div className="popover custom">
            <div className="cover" onClick={this.handleColor}></div>
            <BlockPicker
              color={this.state.color}
              colors={DISCORD_COLORS}
              onChangeComplete={this.handleChangeComplete}
            />
          </div> }
        </div>
      </div>
      <div className="input-group mb-4">
        <div className="input-group-prepend">
          <span className="input-group-text">Description</span>
        </div>
        <textarea
          className="form-control"
          name="d"
          onChange={ this.handleChange }
          placeholder="Description"
          rows={2}
          value={this.state.description}
        />
        <div className="input-group-append">
          <span className="input-group-text">
            <label>
              <input
                type="checkbox"
                name="h"
                checked={ this.state.history }
                onChange={ this.handleChange }
              /> Allow viewing history
            </label>
          </span>
        </div>
      </div>
      <button
        type="button"
        className="btn btn-primary col-12"
        onClick={this.handleCreate}
        disabled={!valid}
      >
        Create room
      </button>
    </React.Fragment>;
  }

  private handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    switch(event.target.name) {
      case "d": {
        this.setState({ description: event.target.value });
        break;
      }
      case "h": {
        this.setState({
          history: (event as React.ChangeEvent<HTMLInputElement>).target.checked
        });
        break;
      }
      case "n": {
        this.setState({ name: event.target.value });
        break;
      }
      default: break;
    }
  }

  private handleChangeComplete(color: ColorResult): void {
    this.setState({
      color: color.rgb
    });
  }

  private handleColor(): void {
    this.setState(state => ({
      showColor: !state.showColor
    }));
  }

  private handleCreate(): void {
    const valid = this.state.description
      && this.state.name
      && this.state.section
      && this.state.visibility;

    if (valid) {
      const color: [number, number, number] = [
        this.state.color.r,
        this.state.color.g,
        this.state.color.b
      ];

      const data: RoomCreation = {
        c: color,
        d: this.state.description!,
        h: this.state.history,
        n: this.state.name!,
        s: this.state.section!,
        v: this.state.visibility
      };

      this.props.socket.emit(ROOM_CREATE, data);
    } else {
      alert("Make sure you provide a description, name, section, and visibility");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleSelectChange(newValue: any | undefined): void {
    if (newValue) {
      this.setState({
        section: newValue.value
      });
    }
  }

  private handleVisibilityChange(event: React.MouseEvent<HTMLLabelElement, MouseEvent>): void {
    this.setState({
      visibility: (event.target as HTMLLabelElement).id as RoomVisibility
    });
  }
}
