import { Op } from "sequelize";

import { ChannelNotFoundError } from "../config/errors";
import { Dict, lineEnd, requireAdmin, isAdmin } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";
import { Link, Room as RoomModel, User } from "../models/models";

import { Action } from "./actions";
import { Command, getRoom, getRoomModel, parseCommand, sendMessage } from "./baseHelpers";

export const usage: Action = {
  doors: {
    description: "See all doors in a room",
    uses: [{
      use: "!doors"
    },{
      admin: true,
      example: "!doors in start",
      use: "!doors in **room**"
    }]
  },
  hide: {
    adminOnly: true,
    description: "Hides links between rooms. Select links using \"from\" and/or \"to\"",
    uses: [{
      example: "!hide from room a",
      explanation: "Hides all links with source **room**",
      use: "!hide from **room**"
    }, {
      example: "!hide to room a",
      explanation: "Hides all links with target **room**",
      use: "!hide to **room**"
    }]
  },
  links: {
    adminOnly: true,
    description: "See links between rooms. Each case shows a single optional parameter",
    uses: [{
      explanation: "see all links",
      use: "!links"
    }, {
      example: "!links from room a",
      explanation: "see all links from start room",
      use: "!links from **room**"
    }, {
      example: "!links to room a",
      explanation: "see all links to target room",
      use: "!links to **room**"
    }, {
      example: "!links locked",
      explanation: "See all links that are locked or unlocked",
      use: "!links **locked | unlocked**"
    }]
  },
  lock: {
    adminOnly: true,
    description: "Locks all links matching the query parameters",
    uses: [{
      example: "!lock from room a",
      explanation: "Locks all links with source **room**",
      use: "!lock from **room**"
    }, {
      example: "!lock to room a",
      explanation: "Locks all links with target **room**",
      use: "!lock to **room**"
    }]
  },
  unhide: {
    adminOnly: true,
    description: "Reveals links between rooms",
    uses: [{
      example: "!unhide from room a",
      explanation: "Reveals all links with source **room**",
      use: "!unhide from **room**"
    }, {
      example: "!unhide to room a",
      explanation: "Reveals all links with target **room**",
      use: "!unhide to **room**"
    }]
  },
  unlock: {
    adminOnly: true,
    description: "Unocks all links matching the query parameters",
    uses: [{
      example: "!unlock from room a",
      explanation: "Unlocks all links with source **room**",
      use: "!unlock from **room**"
    }, {
      example: "!lock to room a",
      explanation: "Unlocks all links with target **room**",
      use: "!unlock to **room**"
    }]
  }
};

async function findRoomByCommand(command: Command, target: string):
Promise<RoomModel> {

  const arr = command.args.get(target);
  let name: string;

  if (arr !== undefined) {
    name = arr.join();
  } else {
    throw new ChannelNotFoundError(`${target} channel`);
  }

  const model = await getRoomModel(name);

  if (model === null) throw new ChannelNotFoundError(name);

  return model;
}

export function handleLock(locked: boolean): (msg: CustomMessage) => Promise<void> {
  return async function changeLock(msg: CustomMessage): Promise<void> {
    requireAdmin(msg);

    const args: {
        sourceId?: string;
        targetId?: string;
      } & Dict<string> = { },
      command = parseCommand(msg, ["from", "to"]);

    if (!command.args.has("from") && !command.args.has("to")) {
      throw new Error("You must provide a source and/or target room");
    }

    if (command.args.has("from")) {
      const fromModel = await findRoomByCommand(command, "from");
      args.sourceId = fromModel.id;
    }

    if (command.args.has("to")) {
      const toModel = await findRoomByCommand(command, "to");
      args.targetId = toModel.id;
    }

    const updated = await Link.update({
      locked
    }, {
      returning: true,
      where: args
    });

    const roomMap: Map<string, string> = new Map(),
      roomSet: Set<string> = new Set();

    for (const link of updated[1]) {
      roomSet.add(link.sourceId);
      roomSet.add(link.targetId);
    }

    const rooms = await RoomModel.findAll({
      include: [{
        as: "sources",
        model: Link
      }],
      attributes: ["id", "name"],
      where: {
        id: {
          [Op.or]: Array.from(roomSet)
        }
      }
    });

    for (const room of rooms) roomMap.set(room.id, room.name);

    const messageArray: string[] = [];

    for (const link of updated[1]) {
      const sourceName: string = roomMap.get(link.sourceId) as string;
      const targetName: string = roomMap.get(link.targetId) as string;

      const start = `${link.locked ? "L" : "Un"}ocked`;
      messageArray.push(`${start} ${sourceName} => ${targetName} (${link.name})`);
    }

    sendMessage(msg, messageArray.length > 0 ?
      // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
      messageArray.sort()
        .join(lineEnd) :
      "No links changed",
    true);
  };
}

export function hide(hidden: boolean): (msg: CustomMessage) => Promise<void> {
  return async function changeLock(msg: CustomMessage): Promise<void> {
    requireAdmin(msg);

    const args: {
        sourceId?: string;
        targetId?: string;
      } & Dict<string> = { },
      command = parseCommand(msg, ["from", "to"]);

    if (!command.args.has("from") && !command.args.has("to")) {
      throw new Error("You must provide a source and/or target room");
    }

    if (command.args.has("from")) {
      const fromModel = await findRoomByCommand(command, "from");
      args.sourceId = fromModel.id;
    }

    if (command.args.has("to")) {
      const toModel = await findRoomByCommand(command, "to");
      args.targetId = toModel.id;
    }

    const updated = await Link.update({
      hidden
    }, {
      returning: true,
      where: args
    });

    const roomMap: Map<string, string> = new Map(),
      roomSet: Set<string> = new Set();

    for (const link of updated[1]) {
      roomSet.add(link.sourceId);
      roomSet.add(link.targetId);
    }

    const rooms = await RoomModel.findAll({
      attributes: ["id", "name"],
      where: {
        id: {
          [Op.or]: Array.from(roomSet)
        }
      }
    });

    for (const room of rooms) roomMap.set(room.id, room.name);

    const messageArray: string[] = [];

    for (const link of updated[1]) {
      const sourceName = roomMap.get(link.sourceId) as string;
      const targetName = roomMap.get(link.targetId) as string;

      const start = `${link.locked ? "L" : "Un"}ocked`;
      messageArray.push(`${start} ${sourceName} => ${targetName} (${link.name})`);
    }

    sendMessage(msg, messageArray.length > 0 ?
      // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
      messageArray.sort()
        .join(lineEnd) :
      "No links changed",
    true);
  };
}

export async function links(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);

  const args: {
      locked?: boolean;
      sourceId?: string;
      targetId?: string;
    } & Dict<string | boolean> = { },
    command = parseCommand(msg, ["locked", "unlocked", "from", "to"]);

  if (command.args.has("from")) {
    const source = await findRoomByCommand(command, "from");
    args.sourceId = source.id;
  }

  if (command.args.has("to")) {
    const target = await findRoomByCommand(command, "to");
    args.targetId = target.id;
  }

  if (command.args.has("locked")) {
    args.locked = true;
  } else if (command.args.has("unlocked")) {
    args.locked = false;
  }

  const linksList = await Link.findAll({
    include: [{
      as: "source",
      attributes: ["name"],
      model: RoomModel
    }, {
      as: "target",
      attributes: ["name"],
      model: RoomModel
    }],
    order: [
      [{ model: RoomModel, as: "source" }, "name", "ASC"],
      [{ model: RoomModel, as: "target"}, "name", "ASC"]
    ],
    where: args
  });

  let linkString = linksList.map((link: Link) => {
    const endString = (link.locked ? ": locked" : "") + (link.hidden ? ": hidden" : "");

    return `${link.source.name} => ${link.target.name}${endString} (${link.name})`;
  })
    .join(lineEnd);

  if (linkString === "") {
    linkString = "No links found with those parameters";
  }

  sendMessage(msg, linkString, true);
}

export async function doors(msg: CustomMessage): Promise<void> {
  const roomModel = await getRoom(msg, true);

  if (roomModel === null) {
    throw new Error("Not in proper channel");
  }

  let messageString = "";
  const linkList = await roomModel.getSources({
    include: [{
      as: "target",
      model: RoomModel
    }, {
      as: "visitors",
      model: User
    }]
  });

  if (linkList.length > 0) {
    const admin = isAdmin(msg);

    for (const link of linkList) {
      if (!link.hidden || admin) {
        messageString += link.name;

        if (admin || link.visitors.find(user => user.id === msg.author.id)) {
          messageString += ` => ${link.target.name}`;
        } else {
          messageString += " => unknown";
        }

        if (link.locked) {
          messageString += " (locked)";
        }

        if (link.hidden) {
          messageString += " (hidden)";
        }
      }
    }
  } else {
    messageString =  "There are no doors in this room";
  }

  sendMessage(msg, messageString);
}
