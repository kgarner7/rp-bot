import React from "react";

import { UserInfo } from "../../../socket/helpers";

interface UserProps extends UserInfo {
  toggleModal(username: string): void;
}

export const User = React.memo(function User(props: UserProps) {
  let header = props.n;

  if (props.l) {
    header += ` (in ${props.l})`;
  }

  const items = props.i.map(item => {
    let itemString = `${item.n} (${item.q || 1}): ${item.d}`;

    if (item.h) {
      itemString += " (hidden)";
    }

    if (item.l) {
      itemString += " (locked)";
    }

    return <li key={ item.n }>{ itemString }</li>;
  });

  return <div className="card item">
    <div className="card-body">
      <h5 className="card-title">{header}</h5>
      <button type="button" className="close" onClick={(): void => props.toggleModal(props.n)}>
        <span>^</span>
      </button>
      <p className="card-text item">
        <ul>
          { items }
        </ul>
      </p>
    </div>
  </div>;
});

export default User;
