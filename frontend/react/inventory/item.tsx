import React from "react";

interface ItemProps {
  description: string;
  locked?: boolean;
  name: string;
  quantity?: number;

  toggle(activeItem: string): void;
}

export const Item = React.memo(function Item(props: ItemProps) {
  const message = `${props.name} (${props.quantity || 1}${props.locked ? " locked": ""})`;
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
