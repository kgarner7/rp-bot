/* eslint-disable @typescript-eslint/unbound-method */
import React from "react";

import Poll from "./poll";
import { VisibleStates } from "./util";

interface HeaderProps {
  selected: VisibleStates;
  socket: SocketIOClient.Socket;
  username: string;

  handleToggle(): void;
}

const Header = React.memo(function Header(props: HeaderProps) {
  return(
    <nav className="navbar navbar-expand-lg border-bottom mb-3">
      <a className="navbar-brand" onClick={props.handleToggle} href="#">Toggle Sidebar</a>
      <div className="navbar-brand">Welcome, {props.username}</div>

      <button
        className="navbar-toggler"
        type="button"
        data-toggle="collapse"
        data-target="#navbarSupportedContent">
        <span className="navbar-toggler-icon">V</span>
      </button>

      <div className="collapse navbar-collapse" id="navbarSupportedContent">
        <ul className="navbar-nav ml-auto mt-2 mt-lg-0">
          <li>
            <Poll selected={ props.selected } socket={ props.socket }/>
          </li>
          <li><a className="dropdown-item" href="/logout">Logout</a></li>
        </ul>
      </div>
    </nav>
  );
});


export default Header;
