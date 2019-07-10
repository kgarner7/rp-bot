import { Op } from "sequelize";

import { guild } from "../client";
import { ChannelNotFoundError } from "../config/errors";
import { Dict, lineEnd, requireAdmin, isAdmin } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";
import { Link, Room as RoomModel } from "../models/models";
import { manager } from "../rooms/roomManager";

import { Action } from "./actions";
import { Command, getRoom, getRoomModel, parseCommand, sendMessage } from "./baseHelpers";

export const usage: Action = {
  doors: {
    description: "See all doors in a room",
    uses: [
      { use: "!doors" },
      { admin: true, use: "!doors in **room**" }
    ]
  },
  hide: {
    adminOnly: true,
    description: "Hides links between rooms",
    uses: [
      {
        example: "!hide from room a",
        explanation: "Hides all links with source **room**",
        use: "!hide from **room**"
      },
      {
        example: "!hide to room a",
        explanation: "Hides all links with target **room**",
        use: "!hide to **room**"
      }
    ]
  },
  links: {
    adminOnly: true,
    description: "See links between rooms. Each case shows a single optional parameter",
    uses: [
      {
        explanation: "see all links",
        use: "!links"
      },
      {
        example: "!links from room a",
        explanation: "see all links from start room",
        use: "!links from **room**"
      },
      {
        example: "!links to room a",
        explanation: "see all links to target room",
        use: "!links to **room**"
      },
      {
        example: "!links locked",
        explanation: "See all links that are locked or unlocked",
        use: "!links **locked | unlocked**"
      }
    ]
  },
  lock: {
    adminOnly: true,
    description: "Locks all links matching the query parameters",
    uses: [
      {
        example: "!lock from room a",
        explanation: "Locks all links with source **room**",
        use: "!lock from **room**"
      },
      {
        example: "!lock to room a",
        explanation: "Locks all links with target **room**",
        use: "!lock to **room**"
      }
    ]
  },
  unhide: {
    adminOnly: true,
    description: "Reveals links between rooms",
    uses: [
      {
        example: "!unhide from room a",
        explanation: "Reveals all links with source **room**",
        use: "!unhide from **room**"
      },
      {
        example: "!unhide to room a",
        explanation: "Reveals all links with target **room**",
        use: "!unhide to **room**"
      }
    ]
  },
  unlock: {
    adminOnly: true,
    description: "Unocks all links matching the query parameters",
    uses: [
      {
        example: "!unlock from room a",
        explanation: "Unlocks all links with source **room**",
        use: "!unlock from **room**"
      },
      {
        example: "!lock to room a",
        explanation: "Unlocks all links with target **room**",
        use: "!unlock to **room**"
      }
    ]
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
      const sourceName: string = roomMap.get(link.sourceId) as string,
        targetName: string = roomMap.get(link.targetId) as string,
        map = manager.links.get(sourceName);

      if (map !== undefined) {
        const neighbor = map.get(targetName);

        if (neighbor !== undefined) {
          neighbor.locked = link.locked;
          const start = `${link.locked ? "L" : "Un"}ocked`;
          messageArray.push(`${start} ${sourceName} => ${targetName} (${neighbor.name})`);
        }
      }
    }

    sendMessage(msg, (messageArray.length > 0 ?
      messageArray.sort()
        .join(lineEnd) :
        "No links changed"),
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
      const sourceName: string = roomMap.get(link.sourceId) as string,
        targetName: string = roomMap.get(link.targetId) as string,
        map = manager.links.get(sourceName);

      if (map !== undefined) {
        const neighbor = map.get(targetName);

        if (neighbor !== undefined) {
          neighbor.hidden = link.hidden;
          const start = `${link.hidden ? "H" : "Not h"}idden`;
          messageArray.push(`${start} ${sourceName} => ${targetName} (${neighbor.name})`);
        }
      }
    }

    sendMessage(msg, (messageArray.length > 0 ?
      messageArray.sort()
        .join(lineEnd) :
        "No links changed"),
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
    const map = manager.links.get(link.source.name)!,
      neighbor = map.get(link.target.name)!,
      endString = (link.locked ? ": locked" : "") + (link.hidden ? ": hidden" : "");

    return `${link.source.name} => ${link.target.name}${endString} (${neighbor.name})`;
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
  const linkList = manager.links.get(roomModel.name);

  if (linkList !== undefined) {
    for (const [, neighbor] of linkList.entries()) {
      if (!neighbor.hidden) {
        messageString += neighbor.name;

        if (neighbor.visitors.has(msg.author.id) || isAdmin(msg)) {
          messageString += ` => ${neighbor.to}`;
        } else {
          messageString += " => unknown";
        }

        if (neighbor.locked) messageString += ": locked";

        messageString += lineEnd;
      }
    }
  } else {
    messageString =  "There are no doors in this room";
  }

  sendMessage(msg, messageString);
}
