/* eslint-disable @typescript-eslint/no-type-alias */
/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";

import {
  MAPS,
  ROOM_INFORMATION,
  USER_INVENTORY_CHANGE,
  USERS_INFO,
  COMMANDS
} from "../../../socket/consts";

import { VisibleStates } from "./util";

const COMMAND_MAPPING: {
  [key in VisibleStates]?: string;
} = {
  [VisibleStates.Inventory]: USER_INVENTORY_CHANGE,
  [VisibleStates.CurrentRooms]: ROOM_INFORMATION,
  [VisibleStates.Commands]: COMMANDS,
  [VisibleStates.Map]: MAPS,
  [VisibleStates.ViewUsers]: USERS_INFO
};

const POLL_TIMING = 120000; // 2 minutes

interface PollProps {
  selected: VisibleStates;
  socket: SocketIOClient.Socket;
}

type PollState = {
  [key in VisibleStates]?: Date;
} & {
  now: Date;
};

function sameDate(a?: Date, b?: Date): boolean {
  if (!a && !b) {
    return true;
  } else if (a && b) {
    return a.getTime() === b.getTime();
  } else {
    return false;
  }
}

const TIMERS: Array<keyof PollState> = [
  VisibleStates.CurrentRooms,
  VisibleStates.Inventory,
  VisibleStates.Map,
  VisibleStates.ViewUsers,
  "now"
];

class Poll extends React.Component<PollProps, PollState> {
  private pollingId: NodeJS.Timeout;

  public constructor(props: PollProps) {
    super(props);

    this.state = {
      [VisibleStates.Inventory]: new Date(),
      now: new Date()
    };

    this.handleRefresh = this.handleRefresh.bind(this);
  }

  public shouldComponentUpdate(nextProps: PollProps, nextState: PollState): boolean {
    if (this.props.selected !== nextProps.selected) {
      return true;
    } else if (COMMAND_MAPPING[nextProps.selected] === undefined) {
      return false;
    } else if (nextProps.selected === VisibleStates.Commands
               && this.state[VisibleStates.Commands]) {
      return false;
    }

    for (const timer of TIMERS) {
      if (!sameDate(this.state[timer], nextState[timer])) {
        return true;
      }
    }

    return false;
  }

  public componentDidMount(): void {
    this.pollingId = setInterval(() => {
      if (this.props.selected in COMMAND_MAPPING) {
        this.conditionallyRefreshState(this.props.selected);
      }

      this.setState({
        now: new Date()
      });
    }, 1000);
  }

  public componentWillUnmount(): void {
    clearInterval(this.pollingId);
  }

  public componentDidUpdate(oldProps: PollProps): void {
    const selected = this.props.selected;

    if (oldProps.selected !== selected && selected in COMMAND_MAPPING) {
      this.conditionallyRefreshState(selected);
    }
  }

  public render(): JSX.Element {
    const shouldShowRefresh = this.props.selected in COMMAND_MAPPING
      && this.props.selected !== VisibleStates.Commands;

    if (shouldShowRefresh) {
      let lastRefreshTime;

      if (this.state[this.props.selected]) {
        const timeDiffInMs = this.state.now.valueOf() -
          this.state[this.props.selected]!.valueOf();

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
      </div>;
    }
  }

  private conditionallyRefreshState(selected: VisibleStates): void {
    const command = COMMAND_MAPPING[selected];

    if (command && selected !== VisibleStates.Commands) {
      this.setState(state => {
        const previousUpdate = state[selected];
        const now = new Date();

        if (!previousUpdate || now.valueOf() - previousUpdate.valueOf() > POLL_TIMING) {
          this.props.socket.emit(command);

          return { [selected]: now } as Pick<PollState, keyof PollState>;
        } else {
          return { [selected]: previousUpdate } as Pick<PollState, keyof PollState>;
        }
      });
    }
  }

  private handleRefresh(): void {
    const selected = this.props.selected;

    const command = COMMAND_MAPPING[selected];

    if (command) {
      const now = new Date();
      this.props.socket.emit(command);
      this.setState({
        [selected]: now,
        now
      } as Pick<PollState, keyof PollState>);
    }
  }
}

export default Poll;
