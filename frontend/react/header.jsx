import React, { Component} from "react";

class Header extends Component {
  render() {
    return(
      <nav class="navbar navbar-expand-lg border-bottom mb-3">
        <a class="navbar-brand" onClick={this.props.handleToggle} href="#">Discordo-chan</a>
  
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon">V</span>
        </button>
  
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <ul class="navbar-nav ml-auto mt-2 mt-lg-0">
            <li class="nav-item">
              <a class="dropdown-item" href="#">Account settings</a>
            </li>
            <li>
              <a class="dropdown-item" href="/logout">Logout</a>
            </li>
          </ul>
        </div>
      </nav>
    );
  }
}

export default Header;