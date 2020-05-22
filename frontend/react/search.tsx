import React, { ChangeEventHandler } from "react";

interface SearchBarProps<T extends string> {
  filter: string;
  name: string;
  options: Array<[T, string]>;
  placeholder: string;

  handleFilter: ChangeEventHandler<HTMLInputElement>;
  handleSort?: (method: T) => void;
}

class SearchBar<T extends string> extends React.PureComponent<SearchBarProps<T>> {
  public render() {
    let first = true;
    const options = this.props.options.map(option => {
      const [id, text] = option;
      const className = "btn btn-primary" + (first ? " active" : "");

      let html;

      if (this.props.handleSort) {
        html = <label key={id} className={className} onClick={() => this.props.handleSort!(id)}>
          <input type="radio" name={this.props.name} id={id} />{text}
        </label>
      } else {
        <label key={id} className={className}>
          <input type="radio" name={this.props.name} id={id} />{text}
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
          placeholder={this.props.placeholder}
          value={this.props.filter}
          onChange={this.props.handleFilter}
        />
        <div className="input-group-append btn-group btn-group-toggle" data-toggle="buttons">
          { options }
        </div>
      </div>
    );
  }
}

export default SearchBar;