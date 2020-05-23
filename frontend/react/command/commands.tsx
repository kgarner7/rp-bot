/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";

import { Dict } from "../../../helpers/base";
import SearchBar from "../util/search";
import { compareString } from "../util/util";

import Command, { CommandData } from "./command";


export interface CommandsProps {
  commands: Dict<CommandData>;
  selected: boolean;
}

export interface CommandsState {
  filter: string;
}

const EMPTY_LIST: Array<[string, string]> = [];

class Commands extends React.PureComponent<CommandsProps, CommandsState> {
  public constructor(props: CommandsProps) {
    super(props);

    this.state = {
      filter: ""
    };

    this.handleFilter = this.handleFilter.bind(this);
  }

  public render(): JSX.Element {
    const className = this.props.selected ? "visible": "invisible";
    let commands = Object.entries(this.props.commands)
      .sort((a, b) => compareString(a[0], b[0], 1));

    if (this.state.filter !== "") {
      commands = commands.filter(command => command[0].startsWith(this.state.filter));
    }

    const commandsElements = commands.map(entry => {
      const [name, command] = entry;

      return <Command key={name} name={name} command={command}/>;
    });

    return (
      <div className={className}>
        <SearchBar
          filter={this.state.filter}
          handleFilter={this.handleFilter}
          options={EMPTY_LIST}
          placeholder="a command"
          name="commands"
        />
        <div className="card-columns col-12 mt-2">
          { commandsElements }
        </div>
      </div>
    );
  }

  private handleFilter(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ filter: event.target.value });
  }
}

export default Commands;
