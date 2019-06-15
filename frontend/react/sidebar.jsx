import React, { Component} from "react";

class Group extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <a href="#" className="list-group-item list-group-item-action" onClick={ this.props.onClick }>{ this.props.name }</a>
  }
}

class Sidebar extends Component{
  handleSelect(value) {
    this.setState(() => ({
      selected: value
    }));

    this.props.handleSelect(value);
  }

  render(){
    const options = this.props.options
      .concat(this.props.admin ? this.props.adminOps : []);

    const items = options.map(value => {
      return <Group key={value} name={value} onClick={(e) => this.handleSelect(value, e)}/>
    });

    return(
      <div className="bg-light border-right" id="sidebar-wrapper">
        <div className="sidebar-heading">Discordo-chan</div>
        <div className="list-group list-group-flush">
          {items}
        </div>
      </div>
    );
  }
}

export default Sidebar;