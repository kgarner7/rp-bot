import React from "react";
import ReactDOM from "react-dom";
import App from "./app";

import "../styles/sidebar.css"
import "../../node_modules/react-grid-layout/css/styles.css";
import "../../node_modules/react-resizable/css/styles.css";
import "../styles/bootstrap.min.css";
import "../styles/main.css";

ReactDOM.render(<App />, document.getElementById("root"));