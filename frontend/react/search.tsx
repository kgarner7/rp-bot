import React, { ChangeEventHandler } from "react";

interface SearchBarProps<T extends string> {
  filter: string;
  name: string;
  options: Array<[T, string]>;
  placeholder: string;

  handleFilter: ChangeEventHandler<HTMLInputElement>;
  handleSort?: (method: T) => void;
}

function SearchBar<T extends string>(props: SearchBarProps<T>) {
  let first = true;
  const options = props.options.map(option => {
    const [id, text] = option;
    const className = "btn btn-primary" + (first ? " active" : "");

    let html;

    if (props.handleSort) {
      html = <label key={id} className={className} onClick={() => props.handleSort!(id)}>
        <input type="radio" name={props.name} id={id} />{text}
      </label>
    } else {
      <label key={id} className={className}>
        <input type="radio" name={props.name} id={id} />{text}
      </label>
    }

    first = false;
    return html;
  });

  return (  
    <div className="input-group col-12">
      <input
        type="text"
        className="form-control"
        placeholder={props.placeholder}
        value={props.filter}
        onChange={props.handleFilter}
      />
      <div className="input-group-append btn-group btn-group-toggle" data-toggle="buttons">
        { options }
      </div>
    </div>
  );
}

export default SearchBar;