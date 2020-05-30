import { Dict } from "../../helpers/base";
import { usages } from "../../listeners/actions";

export interface MinimalCommand {
  a?: boolean;
  d: string;
  u: MinimalUsage[];
}

export interface MinimalUsage {
  a?: boolean;
  e?: string;
  u: string;
  x?: string;
}

export function getCommands(isAdmin: boolean): Dict<MinimalCommand> {
  const commands: Dict<MinimalCommand> = { };

  for (const [name, description] of Object.entries(usages)) {
    if (description.adminOnly && !isAdmin) continue;

    const command: MinimalCommand = {
      d: description.description,
      u: []
    };

    if (description.adminOnly) command.a = true;

    for (const use of description.uses) {
      if (use.admin && !isAdmin) continue;

      const usage: MinimalUsage = { u: use.use };
      if (use.admin) usage.a = true;
      if (use.example) usage.x = use.example;
      if (use.explanation) usage.e = use.explanation;

      command.u.push(usage);
    }

    if (command.u.length > 0) {
      commands[name] = command;
    }
  }

  return commands;
}
