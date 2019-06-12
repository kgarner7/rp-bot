import React, { Component} from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import Inventory from "./inventory";

export class App extends Component{
  constructor(props) {
    super(props);
    const socket = io();

    this.state = {
      inventory: {},
      selected: "Inventory",
      sidebar: true,
      socket: socket
    }

    socket.on("inventory", data => { 
      this.setState({ inventory: JSON.parse(data) });
    });

    socket.emit("inventory");

    this.handleToggleSidebar = this.handleToggleSidebar.bind(this);
    this.handleToggleMode = this.handleToggleMode.bind(this);
  }

  handleToggleSidebar() {
    this.setState(state => ({
      sidebar: !state.sidebar
    }));
  }

  handleToggleMode(selected) {
    this.setState({ selected });
    console.log(selected);
  }

  render(){
    const wrapperClass = "d-flex" + (this.state.sidebar ? "": " toggled");
    return(
      <div id="wrapper" class={wrapperClass}>
        <Sidebar admin={true} options={["Inventory", "Rooms", "Accounts"]} adminOps={["Users"]} handleSelect={this.handleToggleMode}/>
        <div id="page-content-wrapper">
          <Header handleToggle={this.handleToggleSidebar}/>
          <Inventory inventory={this.state.inventory} selected={this.state.selected === "Inventory"}/>
        </div>
      </div>
    );
  }
}

export default App;