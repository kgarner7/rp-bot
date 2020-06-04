import React from "react";

import { MinimalRequest } from "../../../socket/helpers/requests";

export interface RequestProps extends MinimalRequest {
  v?: boolean;
  toggle(id: number): void;
}

const Request = React.memo(function Request(props: RequestProps) {
  let message = `Request ${props.i}: ${props.q} ${props.n} `;

  if (props.u) {
    message += `by ${props.u} `;
  }

  if (props.v) {
    switch (props.s) {
      case 1: message += "(accepted)"; break;
      case 2: message += "(denied)"; break;
      default: message += "(pending)";
    }
  }

  return <div className="card">
    <div className="card-body">
      <h5 className="card-title">{message}</h5>
      <button type="button" className="close" onClick={(): void => props.toggle(props.i)}>
        <span>^</span>
      </button>
      <p className="card-text">
        {props.r}
        {props.d}
      </p>
    </div>
  </div>;
});

export default Request;
