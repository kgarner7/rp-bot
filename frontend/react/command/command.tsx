import React from "react";

export interface CommandUse {
  admin?: boolean;
  example?: string;
  explanation?: string;
  use: string;
}

export interface CommandData {
  admin?: boolean;
  description: string;
  uses: CommandUse[];
}

export interface CommandProps {
  command: CommandData;
  name: string;
}

export const Command = React.memo(function Command(props: CommandProps) {
  const command = props.command;
  const title = props.name + (command.admin ? " (admin)" : "");

  const uses = command.uses.map((use, idx) => {
    const explanation = use.explanation ? (<div>{use.explanation}</div>): undefined;
    const example = use.example ? (<div>{use.example}</div>): undefined;

    return (<li key={idx}>
      <div>{use.use + (use.admin ? " (admin only)": "")}</div>
      {explanation}
      {example}
    </li>);
  });

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{title}</h5>
        <p className="card-text">
          <div>{command.description}</div>
          <hr className="bg-dark"/>
          <ul>
            {uses}
          </ul>
        </p>
      </div>
    </div>
  );
});

export default Command;
