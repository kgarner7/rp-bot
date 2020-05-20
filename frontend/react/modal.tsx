import React from "react";

interface ModalProps {
  body: string;
  html: boolean;
  id: string;
  title: string;
}

function Modal(props: ModalProps) {    
  const id = props.id + "Modal";
  const body = props.html ? 
    (<div dangerouslySetInnerHTML={{ __html: props.body}}></div>): props.body;

  return (
    <div className="modal fade" id={id} tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id={id + "Label"}>{props.title}</h5>
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

export default Modal;