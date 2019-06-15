import { Component} from "react";

class SearchBar extends Component {
  constructor(props) {
    super(props);
  }
  
  render() {
    let first = true;
    const options = this.props.options.map(option => {
      const [id, text] = option;
      const className = "btn btn-primary" + (first ? " active" : "");
      const html = (
        <label key={id} className={className} onClick={(e) => this.props.handleSort(id, e)}>
          <input type="radio" name={this.props.name} id={id} />{text}
        </label>
      );

      first = false;
      return html;
    });

    return (  
      <div className="input-group col-12">
        <input type="text" className="form-control" placeholder={this.props.placeholder} value={this.props.filter} onChange={this.props.handleFilter}/>
        <div className="input-group-append btn-group btn-group-toggle" data-toggle="buttons">
          { options }
        </div>
      </div>
    );
  }
}

export default SearchBar;