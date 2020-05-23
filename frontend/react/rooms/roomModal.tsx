/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";

import SearchBar from "../util/search";

import Message from "./message";
import { MessageData } from "./room";

export interface RoomData {
  archive: MessageData[];
  description: string;
  hasArchive?: boolean;
  messages: MessageData[];
  name: string;
  section: string;
  updatedAt?: number;
}

interface RoomModalProps {
  roomId: string;
  rooms: Map<string, RoomData>;
  username: string;

  getLogs(roomId: string): void;
}

interface RoomModalState {
  filter: string;
}

const EMPTY_LIST: Array<[string, string]> = [];

function matchMessageToFilters(filters: string[], message: MessageData): boolean {
  if (filters.length === 0) return true;

  for (const filter of filters) {
    if (filter.startsWith("a:")) {
      const nickname = filter.substring(2);

      if (message.author.startsWith(nickname)) {
        return true;
      }
    } else {
      if (message.content.includes(filter)) {
        return true;
      }
    }
  }
  return false;
}

export class RoomModal extends React.PureComponent<RoomModalProps, RoomModalState> {
  public constructor(props: RoomModalProps) {
    super(props);

    this.state = {
      filter: ""
    };

    this.handleFilter = this.handleFilter.bind(this);
  }

  public render(): JSX.Element {
    const room = this.props.rooms.get(this.props.roomId);

    let roomArchives: MessageData[];
    let roomMessages: MessageData[];

    if (room) {
      roomArchives = room.archive;
      roomMessages = room.messages;
    } else {
      roomArchives = [];
      roomMessages = [];
    }

    const filters = this.state.filter.split(",").filter(rule => rule.length > 0),
      messages = [];

    for (const message of roomArchives) {
      const isAuthor = this.props.username === message.author;

      if (matchMessageToFilters(filters, message)) {
        messages.push((
          <Message
            key={message.id}
            isAuthor={isAuthor}
            author={message.author}
            content={message.content}
            time={message.time} />
        ));
      }
    }

    let showLogButton;

    if (roomArchives.length > 0) {
      messages.push((
        <hr key="hr" className="bg-dark"/>
      ));
    }

    if (!room || !room.hasArchive) {
      showLogButton = (
        <button
          type="button"
          className="btn btn-success"
          onClick={(): void => this.props.getLogs(this.props.roomId)}
        >
          Get logs
        </button>
      );
    }

    for (const message of roomMessages) {
      const isAuthor = this.props.username === message.author;

      if (matchMessageToFilters(filters, message)) {
        messages.push((
          <Message
            key={message.id}
            isAuthor={isAuthor}
            author={message.author}
            content={message.content}
            time={message.time} />
        ));
      }
    }

    let search;
    if (messages.length > 0 || this.state.filter !== "") {
      search = <SearchBar
        name={this.props.roomId}
        filter={this.state.filter}
        handleFilter={this.handleFilter}
        options={EMPTY_LIST}
        placeholder={"Enter text to search, or a: to find a sender"}
      />;
    }

    const separator = messages.length > 0 ? (<hr className="bg-dark"/>): undefined;

    return (
      <div className="modal fade" id="roomsModal" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="roomsModalLabel">{room?.name} ({room?.section})</h5>
              <button type="button" className="close" data-dismiss="modal">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div dangerouslySetInnerHTML={{ __html: room?.description || ""}}></div>
              <hr className="bg-dark"/>
              {search}
              {separator}
              <div className="messages">{messages}</div>
            </div>
            <div className="modal-footer">
              {showLogButton}
              <button type="button" className="btn btn-secondary" data-dismiss="modal">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  private handleFilter(event: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({ filter: event.target.value });
  }
}

export default RoomModal;
