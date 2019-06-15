import React, { Component} from "react";

class Modal extends Component {
  render() {
    console.log(this.props.id);
    
    const id = this.props.id + "Modal";
    const body = this.props.html ? 
    (<div dangerouslySetInnerHTML={{ __html: this.props.body}}></div>): this.props.body;

    return (
      <div className="modal fade" id={id} tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id={id + "Label"}>{this.props.title}</h5>
              <button type="button" className="close" data-dismiss="modal">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              {body}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Modal;