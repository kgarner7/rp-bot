import React from "react";

export interface MessageProps {
  author: string;
  content: string;
  isAuthor: boolean;
  time: Date;
}

export const Message = React.memo(function Message(props: MessageProps) {
  const className = `${props.isAuthor ? "right": "left"} alert alert-primary`;
  const name = props.isAuthor ? "You" : props.author;
  const time = new Date(props.time).toLocaleString("en-US");

  return (
    <div className={className}>
      <div className="msg-header">{name} <span>({time})</span></div>
      <div>{props.content}</div>
    </div>
  );
});

export default Message;
