/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";

import Message from "./message";

export interface MessageData {
  author: string;
  content: string;
  id: string;
  time: Date;
}

export interface RoomProps {
  archive: MessageData[];
  description: string;
  id: string;
  messages: MessageData[];
  name: string;
  section: string;
  username: string;

  toggleModal(id: string): void;
}

export class Room extends React.PureComponent<RoomProps> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly messages: React.RefObject<any>;
  private scroll: number;

  public constructor(props: RoomProps) {
    super(props);
    this.state = {};

    this.messages = React.createRef();
    this.handleScroll = this.handleScroll.bind(this);
    this.scroll = -1;
  }

  public componentDidMount(): void {
    const scrollTarget = this.scroll === -1 ?
      this.messages.current.scrollHeight : this.scroll;

    this.messages.current.scrollTop = scrollTarget;
  }

  public componentDidUpdate(): void {
    if (this.scroll === -1) {
      this.messages.current.scrollTop = this.messages.current.scrollHeight;
    }
  }

  public render(): JSX.Element {
    const allMessages = this.props.archive.concat(this.props.messages);

    const messages = allMessages.map(message => {
      const isAuthor = this.props.username === message.author;

      return (<div key={message.id}>
        <Message
          isAuthor={isAuthor}
          author={message.author}
          content={message.content}
          time={message.time}
        />
      </div>);
    });

    return (
      <div className="card room">
        <div className="card-body">
          <h5 className="card-title">{this.props.name} ({this.props.section})</h5>
          <button
            type="button"
            className="close"
            onClick={(): void => this.props.toggleModal(this.props.id)}>
            <span>^</span>
          </button>
          <div className="card-text" ref={this.messages} onScroll={this.handleScroll}>
            {messages}
          </div>
        </div>
      </div>
    );
  }

  private handleScroll(): void {
    const elem = this.messages.current;
    this.scroll = elem.scrollTop === elem.scrollTopMax ? -1 : elem.scrollTop;
  }
}

export default Room;
