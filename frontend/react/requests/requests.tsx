import React from "react";

import { REQUEST_CHANGE, REQUEST_CREATE } from "../../../socket/consts";
import { MinimalRequest, RequestChange, RequestCreation } from "../../../socket/helpers/requests";
import { isInt } from "../../../socket/helpers/util";
import Modal from "../util/modal";
import SearchBar from "../util/search";
import { compareString } from "../util/util";

import Request from "./request";

enum RequestSort {
  ALL = "",
  PENDING = "p",
  ACCEPTED = "a",
  DENIED = "d"
}

const SORT_OPTIONS: Array<[RequestSort, string]> = [
  [RequestSort.PENDING, "pending"],
  [RequestSort.ACCEPTED, "accepted"],
  [RequestSort.DENIED, "denied"],
  [RequestSort.ALL, "all"]
];

export interface RequestsProps {
  admin: boolean;
  requests: MinimalRequest[];
  selected: boolean;
  socket: SocketIOClient.Socket;
}

export interface RequestsState {
  activeReq?: number;
  description?: string;
  deny?: string;
  filter: string;
  name?: string;
  quantity?: number;
  sort: RequestSort;
}

export class Requests extends React.PureComponent<RequestsProps, RequestsState> {
  public constructor(props: RequestsProps) {
    super(props);

    this.state = {
      filter: "",
      sort: RequestSort.PENDING
    };

    this.denyChange = this.denyChange.bind(this);
    this.handleApprove = this.handleApprove.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleCreate = this.handleCreate.bind(this);
    this.handleDeny = this.handleDeny.bind(this);
    this.handleFilter = this.handleFilter.bind(this);
    this.handleSort = this.handleSort.bind(this);
    this.toggle = this.toggle.bind(this);
    this.toggleNew = this.toggleNew.bind(this);
  }

  public componentDidUpdate(oldProps: RequestsProps): void {
    if (this.state.activeReq && oldProps !== this.props) {
      for (const request of this.props.requests) {
        if (request.i === this.state.activeReq && request.s !== 0) {
          $("#requestsModal").modal("hide");
          this.setState({ activeReq: undefined });
        }
      }
    } else if (this.state.name && this.state.description && this.state.quantity) {
      if (this.props.requests.length > oldProps.requests.length) {
        for (let idx = this.props.requests.length - 1; idx >= 0; idx--) {
          const request = this.props.requests[idx];

          if (request.d === this.state.description
              && request.n === this.state.name
              && request.q === this.state.quantity) {

            $("#newRequestModal").modal("hide");
            break;
          }
        }
      }
    }
  }

  public render(): JSX.Element {
    const className = this.props.selected ? "visible": "invisible";
    const filter = this.state.filter;

    let activeRequest: MinimalRequest | undefined;

    const requests = this.props.requests.filter(request => {
      let included = true;
      if (filter !== "") {
        if (this.props.admin && filter.startsWith("u:")) {
          included = (request.u || "").startsWith(filter.substring(2));
        } else {
          included = isInt(filter) ?
            request.i.toString(10).includes(filter): request.n.includes(filter);
        }
      }

      if (included) {
        switch(this.state.sort) {
          case RequestSort.PENDING: included = request.s === 0; break;
          case RequestSort.ACCEPTED: included = request.s === 1; break;
          case RequestSort.DENIED: included = request.s === 2; break;
          default: break;
        }
      }

      if (included && this.state.activeReq === request.i) {
        activeRequest = request;
      }

      return included;
    })
      .sort((a, b) => compareString(a.i, b.i, -1))
      .map(request =>
        <Request key={request.i} toggle={this.toggle}
          v={this.state.sort === RequestSort.ALL}
          {...request}/>);

    let placeholder = "Request id or item name";

    if (this.props.admin) {
      placeholder += " or u: for username";
    }

    let body: JSX.Element | string = "";
    let title = "";

    if (activeRequest) {
      const time = new Date(activeRequest.c).toLocaleString("en-US");
      title = `Request ${activeRequest.i}: ${activeRequest.q} ${activeRequest.n} (${time})`;

      let statusString: string;

      switch (activeRequest.s) {
        case 1: statusString = "accepted"; break;
        case 2: statusString = "denied"; break;
        default: statusString = "pending";
      }

      if (this.props.admin && activeRequest.s === 0) {
        body = <React.Fragment>
          <h4>This request is <strong>{statusString}</strong></h4>
          <div className="input-group mt-3">
            <div className="input-group-prepend">
              <span className="input-group-text">Quantity override</span>
            </div>
            <input
              className="form-control"
              onChange={this.handleChange}
              name="q"
              placeholder="quantity"
              type="number"
              min={1}
              value={this.state.quantity || activeRequest.q}
            />
          </div>
          <div className="input-group mt-3">
            <div className="input-group-prepend">
              <span className="input-group-text">Description override</span>
            </div>
            <textarea
              className="form-control" name="d"
              onChange={this.handleChange} value={this.state.description || activeRequest.d}
              placeholder="description"
            />
          </div>
          <div className="input-group mt-3">
            <div className="input-group-prepend">
              <button
                className="btn btn-outline-success"
                type="button"
                onClick={this.handleApprove}
              >
                Approve
              </button>
              <button
                className="btn btn-outline-danger"
                type="button"
                disabled={!this.state.deny}
                onClick={this.handleDeny}
              >
                Deny
              </button>
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="Reason for denying"
              value={this.state.deny}
              onChange={this.denyChange}
            />
          </div>
        </React.Fragment>;
      } else {
        body = <React.Fragment>
          <h4>This request is <strong>{statusString}</strong></h4>
          <div>{activeRequest.d}</div>
        </React.Fragment>;
      }
    }

    const validNewReq = this.state.description
      && this.state.name
      && (this.state.quantity !== undefined && this.state.quantity > 0);

    return <div className={className}>
      <div className="col-12">
        <button type="button" className="col-12 btn btn-primary mb-3" onClick={this.toggleNew}>
          Request an item!
        </button>
      </div>
      <SearchBar<RequestSort>
        filter={this.state.filter}
        name="requests"
        options={SORT_OPTIONS}
        placeholder={placeholder}
        handleFilter={this.handleFilter}
        handleSort={this.handleSort}
      />
      <Modal
        body={body}
        id="requests"
        title={title}
      />
      <Modal
        body={<React.Fragment>
          <div className="input-group mb-4">
            <div className="input-group-prepend">
              <span className="input-group-text">Name and quantity</span>
            </div>
            <input
              className="form-control"
              onChange={this.handleChange}
              name="n"
              placeholder="name"
              type="text"
              value={this.state.name}
            />
            <input
              className="form-control"
              onChange={this.handleChange}
              name="q"
              placeholder="quantity"
              type="number"
              min={1}
              value={this.state.quantity}
            />
          </div>
          <div className="input-group mb-4">
            <div className="input-group-prepend">
              <span className="input-group-text">Description</span>
            </div>
            <textarea
              className="form-control" name="d"
              onChange={this.handleChange} value={this.state.description}
              placeholder="description"
            />
          </div>
          <button
            type="button" className="btn-success btn col-12"
            disabled={!validNewReq} onClick={this.handleCreate}
          >
            Create request!
          </button>
        </React.Fragment>}
        id="newRequest"
        title="New item!"
      />
      <div className="card-columns col-12 mt-2">
        { requests }
      </div>
    </div>;
  }

  private denyChange(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({
      deny: event.target.value
    });
  }

  private handleApprove(): void {
    if (this.state.activeReq && confirm("Are you sure you want to approve this request?")) {
      const data: RequestChange = {
        a: true,
        i: this.state.activeReq
      };

      if (this.state.description) {
        data.d = this.state.description;
      }

      if (this.state.quantity) {
        data.q = this.state.quantity;
      }

      this.props.socket.emit(REQUEST_CHANGE, data);
    }
  }

  private handleDeny(): void {
    if (this.state.activeReq) {
      if (!this.state.deny) {
        alert("You must provide a reason for rejecting this request");
        return;
      }

      if (confirm("Are you sure you want to deny this request?")) {
        const data: RequestChange = {
          a: false,
          i: this.state.activeReq,
          r: this.state.deny
        };

        this.props.socket.emit(REQUEST_CHANGE, data);
      }
    }
  }

  private handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    switch(event.target.name) {
      case "d":
        this.setState({ description: event.target.value }); break;
      case "q":
        this.setState({ quantity: (event.target as HTMLInputElement).valueAsNumber }); break;
      case "n":
        this.setState({ name: event.target.value }); break;
      default: break;
    }
  }

  private handleCreate(): void {
    const validNewReq = this.state.description
      && this.state.name
      && (this.state.quantity !== undefined && this.state.quantity > 0);

    if (validNewReq) {
      const data: RequestCreation = {
        d: this.state.description!,
        n: this.state.name!,
        q: this.state.quantity!
      };

      this.props.socket.emit(REQUEST_CREATE, data);
    }
  }

  private handleFilter(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({
      filter: event.target.value
    });
  }

  private handleSort(sort: RequestSort): void {
    this.setState({ sort });
  }

  private toggle(id: number): void {
    this.setState({
      activeReq: id,
      deny: "",
      description: undefined,
      quantity: undefined
    });

    $("#requestsModal").modal("show");
  }

  private toggleNew(): void {
    this.setState({
      description: "",
      name: "",
      quantity: 1
    });

    $("#newRequestModal").modal("show");
  }
}

export default Requests;
