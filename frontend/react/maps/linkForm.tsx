import React from "react";

import { LinkCreation } from "../../../socket/helpers";

export interface LinkFormProps {
  selected: string[];

  handleNewLink(data: LinkCreation): void;
}

export interface LinkFormState {
  bidirectional?: boolean;

  ih?: boolean;
  il?: boolean;
  in?: string;

  oh?: boolean;
  ol?: boolean;
  on?: string;
}

export class LinkForm extends React.PureComponent<LinkFormProps, LinkFormState> {
  public constructor(props: LinkFormProps) {
    super(props);

    this.state = {};

    this.createLink = this.createLink.bind(this);
    this.handleCheckChange = this.handleCheckChange.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.toggleBidirecitonal = this.toggleBidirecitonal.bind(this);
  }

  public componentDidUpdate(oldProps: LinkFormProps): void {
    if (oldProps.selected !== this.props.selected) {
      this.setState({
        bidirectional: false,
        ih: false,
        il: false,
        in: "",
        oh: false,
        ol: false,
        on: ""
      });
    }
  }

  public render(): JSX.Element {
    let buttonClass = "col-12 btn btn-primary mb-3 block";

    if (this.state.bidirectional) {
      buttonClass += " active";
    }

    const valid = this.state.on
      && (this.state.bidirectional ? this.state.in: true);

    return <div>
      <div className="input-group mb-3">
        <div className="input-group-prepend">
          <span className="input-group-text">Outgoing link: </span>
        </div>
        <input
          type="text"
          name="on"
          placeholder="name"
          className="form-control"
          onChange={this.handleNameChange}
        />
        <div className="input-group-append">
          <span className="input-group-text">
            <input
              type="checkbox"
              onChange={this.handleCheckChange}
              name="oh"
              checked={ this.state.oh }
            /> Hidden
          </span>
          <span className="input-group-text">
            <input
              type="checkbox"
              onChange={this.handleCheckChange}
              name="ol"
              checked={ this.state.ol }
            /> Locked
          </span>
        </div>
      </div>
      <button className={buttonClass} onClick={this.toggleBidirecitonal}>
        Bidirectional?
      </button>
      { this.state.bidirectional &&
        <div className="input-group mb-3">
          <div className="input-group-prepend">
            <div className="input-group-text">Incoming link: </div>
          </div>
          <input
            type="text"
            name="in"
            placeholder="name"
            className="form-control"
            onChange={this.handleNameChange}
          />
          <div className="input-group-append">
            <span className="input-group-text">
              <input
                type="checkbox"
                onChange={this.handleCheckChange}
                name="ih"
                checked={ this.state.ih }
              /> Hidden
            </span>
            <span className="input-group-text">
              <input
                type="checkbox"
                onChange={this.handleCheckChange}
                name="il"
                checked={ this.state.il }
              /> Locked
            </span>
          </div>
        </div>
      }
      <button
        hidden={!valid}
        type="button"
        className="col-12 btn btn-success"
        onClick={this.createLink}>
        Create link!
      </button>
    </div>;
  }

  private createLink(): void {
    if (this.state.on && (this.state.bidirectional ? this.state.in !== undefined: true)) {
      const data: LinkCreation = {
        b: this.state.bidirectional === true,
        f: this.props.selected[0],
        o: {
          h: this.state.oh,
          l: this.state.ol,
          n: this.state.on
        },
        t: this.props.selected[1]
      };

      if (this.state.bidirectional) {
        data.i = {
          h: this.state.ih,
          l: this.state.il,
          n: this.state.in!
        };
      }

      this.props.handleNewLink(data);
    }
  }

  private handleCheckChange(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({
      [event.target.name as "oh" | "ol" | "ih" | "il"]: event.target.checked
    });
  }

  private handleNameChange(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({
      [event.target.name as "in" | "on"]: event.target.value
    });
  }

  private toggleBidirecitonal(): void {
    this.setState(state => ({
      bidirectional: !state.bidirectional
    }));
  }
}

export default LinkForm;
