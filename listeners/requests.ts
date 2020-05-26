import { Op, WhereAttributeHash } from "sequelize";

import { guild } from "../client";
import { requireAdmin, sentToAdmins } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";
import { lock, unlock } from "../helpers/locks";
import { Undefined } from "../helpers/types";
import { Request, User } from "../models/models";
import { RequestStatus } from "../models/request";

import { Action } from "./actions";
import { Command, parseCommand, sendMessage, ignorePromise } from "./baseHelpers";
import { getInt } from "./items";

export const usage: Action = {
  create: {
    description: "Makes a request to create a new item",
    uses: [
      {
        example: "!create paper text \"a piece of paper\"",
        explanation: "Requests a new item, item name with description, description",
        use: "!create **item name** text **description**"
      },
      {
        explanation: "Requests the creation of number > 0 of an item",
        use: "!create **number** of **item** text **description**"
      }
    ]
  },
  requests: {
    adminOnly: true,
    description: "Used to handle",
    uses: [
      {
        explanation: "Gets a list of requests for users based on a simple filter",
        use: "!requests **all | accepted | denied | none** for **optional userlist**"
      },
      {
        explanation: "Rejects the request for the reason, text",
        use: "!requests deny **number** reason **text**"
      },
      {
        explanation: "Approves the request with the id, number",
        use: "!requests **approve** **number**"
      },
      {
        explanation: "Approves the request and overries the count/text",
        use: "!requests approve **number** count **number** text **text**"
      }
    ]
  }
};

export async function createItem(msg: CustomMessage): Promise<void> {
  const command = parseCommand(msg, ["of", "text"]),
    user = await User.findOne({
      attributes: ["discordName", "id"],
      where: {
        id: msg.author.id
      }
    });

  if (!user) throw new Error(`Could not find user ${msg.author.id}`);

  let itemName = command.params.join(" "),
    quantity = 1;

  if (command.args.has("of")) {
    quantity = getInt(itemName);
    itemName = command.args.get("of")!.join(" ");
  }

  if (!command.args.has("text")) throw new Error("Must provide description");

  const description = command.args.get("text")!.join(" ");

  const request = await user.createRequest({
    description,
    name: itemName,
    quantity
  });

  sendMessage(msg,
    `Created request for new item ${itemName} with description ${description}`);

  const message = `New request from ${user.discordName} (#${request.id}): ` +
  `${quantity} of ${itemName}`;

  await sentToAdmins(guild, message);
}

const REQUEST_OPTIONS = [
  "approve",
  "count",
  "deny",
  "for",
  "reason",
  "text"
];

export async function requests(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);

  const command = parseCommand(msg, REQUEST_OPTIONS);

  if (command.args.has("approve") || command.args.has("deny")) {
    return changeRequestStatus(msg, command);
  } else {
    await viewRequests(msg, command.params, command.args.get("for"));
  }
}

async function viewRequests(msg: CustomMessage,
                            filterList: string[],
                            users: Undefined<string[]>): Promise<void> {
  let where: WhereAttributeHash;

  if (filterList.length === 0) {
    where = {
      status: 0
    };
  } else {
    const filter = filterList.join(" ");

    switch (filter) {
      case "all":
        where = { };
        break;
      case "accepted":
        where = { status: 1 };
        break;
      case "denied":
        where = { status : 2 };
        break;
      default:
        where = { status: 0 };
        break;
    }
  }

  if (users) where.discordName = { [Op.or]: users };

  const searchedRequests = await Request.findAll({
    include: [{
      attributes: ["discordName"],
      model: User
    }],
    order: [["createdAt", "ASC"]],
    where
  });

  let message = searchedRequests.map(r =>
    `Request ${r.id} for ${r.User.discordName}: ` +
    `\n${r.quantity} of ${r.name}: ${r.description} (${r.getStatus()} ${r.reason || ""})`
  )
    .join("\n");

  if (message.length === 0) {
    message = "No requests found for that filter";
  }

  sendMessage(msg, message, true);
}

async function changeRequestStatus(msg: CustomMessage,
                                   command: Command): Promise<void> {

  const requestId = command.args.has("deny") ?
    getInt(command.args.get("deny")![0]) :
    getInt(command.args.get("approve")![0]);

  const request = await Request.findOne({
    include: [{
      attributes: ["discordName", "id", "inventory"],
      model: User
    }],
    where: {
      id: requestId
    }
  });

  if (!request) throw new Error(`No request of id ${requestId}`);
  else if (request.getStatus() !== "pending") {
    throw new Error(`Request ${requestId} is not pending`);
  }

  const requester = guild.members.resolve(request.UserId)!;

  if (command.args.has("deny")) {
    const reason = command.args.get("reason");

    if (reason === undefined) throw new Error("Must provide reason for denial");

    const reasonString = reason.join(" ");

    await request.update({
      reasonString,
      status: RequestStatus.DENIED
    });

    ignorePromise(requester.send(`Your request for ${request.name} was denied: ${reasonString}`));
    sendMessage(msg, `Successfully declined ${requestId} for ${requester.displayName}`);
  } else {
    const name = request.name;

    let changedMessage = "",
      description = request.description,
      quantity = request.quantity;

    if (command.args.has("count")) {
      quantity = getInt(command.args.get("quantity")![0]);
      changedMessage = `\nquantity ${request.quantity} => ${quantity}`;
    }

    if (command.args.has("text")) {
      description = command.args.get("text")!.join(" ");
      changedMessage += `\ndescription ${request.description} => ${description}`;
    }

    const redlock = await lock({ user: requester.id });

    try {
      const user = request.User;
      await user.reload({ attributes: ["inventory" ]});

      let message: string;

      if (name in user.inventory) {
        user.inventory[name].quantity = (user.inventory[name].quantity || 1) + quantity;
        user.inventory[name].description = description;

        message = `You already have ${name}. Its quantity and description were updated`;
      } else {
        user.inventory[name] = {
          description,
          editable: true,
          hidden: false,
          locked: false,
          name,
          quantity
        };

        message = `Created ${quantity} of new item ${name}: ${description}`;
      }

      await request.update({  status: RequestStatus.ACCEPTED });
      await user.update({ inventory: user.inventory });

      ignorePromise(requester.send(message + changedMessage));
      sendMessage(msg, `Created ${quantity} of ${name} for ${user.discordName}`);
    } finally {
      await unlock(redlock);
    }
  }
}
