import { Message as DiscordMessage } from "discord.js";
import { Op } from "sequelize";

import { ChannelNotFoundError } from "../config/errors";
import { Dict, mainGuild, requireAdmin, roomManager } from "../helpers/base";
import { Link, Room as RoomModel } from "../models/models";

import { Command, getRoom, getRoomModel, parseCommand, sendMessage } from "./baseHelpers";

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

export function handleLock(locked: boolean): (msg: DiscordMessage) => Promise<void> {
  return async function changeLock(msg: DiscordMessage): Promise<void> {
    requireAdmin(msg);

    const args: {
      sourceId?: string;
      targetId?: string;
    } & Dict<string> = { },
      command = parseCommand(msg.content, ["from", "to"]),
      manager = roomManager();

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
        .join("\n") :
        "No links changed"),
      true);
  };
}

export async function links(msg: DiscordMessage): Promise<void> {
  requireAdmin(msg);

  const args: {
    locked?: boolean;
    sourceId?: string;
    targetId?: string;
  } & Dict<string | boolean> = { },
    command = parseCommand(msg.content, ["locked", "unlocked", "from", "to"]),
    manager = roomManager();

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
      endString = link.locked ? ": locked" : "";

    return `${link.source.name} => ${link.target.name}${endString} (${neighbor.name})`;
  })
  .join("\n");

  if (linkString === "") {
    linkString = "No links found with those parameters";
  }

  sendMessage(msg, linkString, true);
}

export async function doors(msg: DiscordMessage): Promise<void> {
  const manager = roomManager(),
    roomModel = await getRoom(msg, true);

  if (roomModel === null) {
    throw new Error("Not in proper channel");
  }

  let messageString = "";
  const linkList = manager.links.get(roomModel.name);

  if (linkList !== undefined) {
    for (const [, neighbor] of linkList.entries()) {
      messageString += neighbor.name;

      if (neighbor.visitors.has(msg.author.id) ||
        msg.author.id === mainGuild().ownerID) {
        messageString += ` => ${neighbor.to}`;
      } else {
        messageString += " => unknown";
      }

      if (neighbor.locked) messageString += ": locked";

      messageString += "\n";
    }
  } else {
    messageString =  "There are no doors in this room";
  }

  sendMessage(msg, messageString);
}
