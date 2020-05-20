import React from "react";

import { 
  MAPS,
  ROOM_INFORMATION,
  USER_INVENTORY_CHANGE,
} from "../../socket/consts";

const COMMAND_MAPPING = {
  Inventory: USER_INVENTORY_CHANGE,
  "Current room(s)": ROOM_INFORMATION,
  Map: MAPS
}

const POLL_TIMING = 120000; // 2 minutes

interface PollProps {
  selected: string;
  socket: SocketIOClient.Socket;
}

type PollOp = "Inventory" | "Current room(s)" | "Map";

interface PollState {
  Inventory: Date;
  "Current room(s)"?: Date;
  Map?: Date;
  now: Date;
}

class Poll extends React.Component<PollProps, PollState> {
  private pollingId: NodeJS.Timeout;

  public constructor(props: PollProps) {
    super(props);

    this.state = {
      Inventory: new Date(),
      "Current room(s)": undefined,
      Map: undefined,
      now: new Date()
    }

    this.handleRefresh = this.handleRefresh.bind(this);
  }

  public componentDidMount() {
    this.pollingId = setInterval(() => {
      if (this.props.selected in COMMAND_MAPPING) {
        this.conditionallyRefreshState(this.props.selected as PollOp);
      }
      
      this.setState({ 
        now: new Date()
      });
    }, 1000);
  }

  public componentWillUnmount() {
    clearInterval(this.pollingId); 
  }

  public componentDidUpdate(oldProps: PollProps) {
    const selected = this.props.selected;

    if (oldProps.selected !== selected && selected in COMMAND_MAPPING) {
      this.conditionallyRefreshState(selected as PollOp);
    }
  }
  
  public render() {
    if (this.props.selected in this.state) {
      let lastRefreshTime;

      if (this.props.selected in COMMAND_MAPPING && this.state[this.props.selected as PollOp]) {
        const timeDiffInMs = this.state.now.valueOf() - 
          this.state[this.props.selected as PollOp]!.valueOf();
          
        const nextRefresh = Math.round((POLL_TIMING - timeDiffInMs) / 1000);

        if (nextRefresh === 1) {
          lastRefreshTime = "1 second";
        } else {
          lastRefreshTime = `${nextRefresh} seconds`;
        }
      } else {
        lastRefreshTime = "now";
      }

      return <div className="poll">
        <span>Next refresh: {lastRefreshTime}</span>
        <a className="dropdown-item" href="#" onClick={ this.handleRefresh }>Force refresh</a>
      </div>;
    } else {
      return <div className="poll">
        <span>No refresh necessary</span>
      </div>
    }
  }

  private conditionallyRefreshState(selected: PollOp) {
    const previousUpdate = this.state[selected];
    const now = new Date();

    if (!previousUpdate || now.valueOf() - previousUpdate.valueOf() > POLL_TIMING) {
      this.props.socket.emit(COMMAND_MAPPING[selected]);
      this.setState({
        [selected]: now
      } as Pick<PollState, keyof PollState>);
    }
  }

  private handleRefresh() {
    const selected = this.props.selected;

    if (selected in COMMAND_MAPPING) {
      const now = new Date();
      this.props.socket.emit(COMMAND_MAPPING[selected as PollOp]);
      this.setState({
        [selected as PollOp]: now,
        now
      } as Pick<PollState, keyof PollState>);
    }
  }
}

export default Poll;