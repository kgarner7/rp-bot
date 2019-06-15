import { Component } from "react";
import SearchBar from "./search";
import { compareString } from "./rooms";

class Command extends Component {
  render() {
    const command = this.props.command,
      title = this.props.name + (command.admin ? " (admin)" : "");

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
}

class Commands extends Component {
  constructor(props) {
    super(props);
    this.state = {
      filter: ""
    };

    this.handleFilter = this.handleFilter.bind(this);
  }

  handleFilter(event) {
    this.setState({ filter: event.target.value });
  }

  render() {
    const className = this.props.selected ? "visible": "invisible";
    let commands = Object.entries(this.props.commands)
      .sort((a, b) => compareString(a[0], b[0]));

    if (this.state.filter !== "") {
      commands = commands.filter(command => command[0].startsWith(this.state.filter));
    }

    commands = commands.map(entry => {
      const [name, command] = entry;

      return <Command key={name} name={name} command={command}/>
    });

    return (
      <div className={className}>
        <SearchBar filter={this.state.filter} handleFilter={this.handleFilter} options={[]} placeholder="a command"/>
        <div className="card-columns col-12 mt-2">
          {commands}
        </div>
      </div>
    )
  }
}

export default Commands;