import React from "react";

import { VisibleStates } from "./visibleStates";
import Poll from "./poll";

interface HeaderProps {
  selected: VisibleStates;
  socket: SocketIOClient.Socket;
  username: string;

  handleToggle(): void;
}

const Header = React.memo((props: HeaderProps) => {
  return(
    <nav className="navbar navbar-expand-lg border-bottom mb-3">
      <a className="navbar-brand" onClick={props.handleToggle} href="#">Toggle Sidebar</a>
      <div className="navbar-brand">Welcome, {props.username}</div>

      <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
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