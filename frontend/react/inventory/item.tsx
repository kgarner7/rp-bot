import React from "react";

interface ItemProps {
  description: string;
  hidden?: boolean;
  locked?: boolean;
  name: string;
  quantity?: number;

  toggle(activeItem: string): void;
}

export const Item = React.memo(function Item(props: ItemProps) {
  const hideMsg = props.hidden ? " hidden": "";
  const lockMsg = props.locked ? " locked": "";
  const quantity = props.quantity || 1;

  const message = `${props.name} (${quantity}${lockMsg}${hideMsg})`;

  return (
    <div className="card item">
      <div className="card-body">
        <h5 className="card-title">{message}</h5>
        <button type="button" className="close" onClick={(): void => props.toggle(props.name)}>
          <span>^</span>
        </button>
        <p className="card-text item" dangerouslySetInnerHTML={{ __html: props.description}}></p>
      </div>
    </div>
  );
});

export default Item;
