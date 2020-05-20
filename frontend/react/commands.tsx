import React from "react";
import SearchBar from "./search";
import { compareString } from "./rooms";
import { Dict } from "../../helpers/base";

export interface CommandUse {
  admin?: boolean;
  example?: string;
  explanation?: string;
  use: string;
}

export interface CommandData {
  admin?: boolean;
  description: string;
  uses: CommandUse[];
}

export interface CommandProps {
  command: CommandData;
  name: string;
}

function Command(props: CommandProps): JSX.Element {
  const command = props.command;
  const title = props.name + (command.admin ? " (admin)" : "");

  const uses = command.uses.map((use, idx) => {
    const explanation = use.explanation ? (<div>{use.explanation}</div>): undefined;
    const example = use.example ? (<div>{use.example}</div>): undefined;

    return (<li key={idx}>
      <div>{use.use + (use.admin ? " (admin only)": "")}</div>
      {explanation}
      {example}        
    </li>);
  });

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{title}</h5>
        <p className="card-text">
          <div>{command.description}</div>
          <hr className="bg-dark"/>
          <ul>
            {uses}
          </ul>
        </p>
      </div>
    </div>
  );
}

export interface CommandsProps {
  commands: Dict<CommandData>;
  selected: boolean;
}

export interface CommandsState {
  filter: string;
}

class Commands extends React.Component<CommandsProps, CommandsState> {
  public constructor(props: CommandsProps) {
    super(props);

    this.state = {
      filter: ""
    };

    this.handleFilter = this.handleFilter.bind(this);
  }

  public render() {
    const className = this.props.selected ? "visible": "invisible";
    let commands = Object.entries(this.props.commands)
      .sort((a, b) => compareString(a[0], b[0], 1));

    if (this.state.filter !== "") {
      commands = commands.filter(command => command[0].startsWith(this.state.filter));
    }

    const commandsElements = commands.map(entry => {
      const [name, command] = entry;

      return <Command key={name} name={name} command={command}/>
    });

    return (
      <div className={className}>
        <SearchBar
          filter={this.state.filter}
          handleFilter={this.handleFilter}
          options={[]}
          placeholder="a command"
          name="commands"
        />
        <div className="card-columns col-12 mt-2">
          { commandsElements }
        </div>
      </div>
    )
  }

  private handleFilter(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ filter: event.target.value });
  }
}

export default Commands;