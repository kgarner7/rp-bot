import { Component} from "react";

class Header extends Component {
  render() {
    return(
      <nav className="navbar navbar-expand-lg border-bottom mb-3">
        <a className="navbar-brand" onClick={this.props.handleToggle} href="#">Welcome {this.props.username}</a>
  
        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon">V</span>
        </button>
  
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav ml-auto mt-2 mt-lg-0">
            <li>
              <a className="dropdown-item" href="/logout">Logout</a>
            </li>
          </ul>
        </div>
      </nav>
    );
  }
}

export default Header;