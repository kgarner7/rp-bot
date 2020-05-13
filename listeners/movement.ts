import { GuildMember, Role } from "discord.js";

import { guild } from "../client";
import { ChannelNotFoundError } from "../config/errors";
import { lineEnd, requireAdmin } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";
import { lock } from "../helpers/locks";
import { Undefined } from "../helpers/types";
import { Link, Room as RoomModel } from "../models/models";
import { Neighbor } from "../rooms/room";
import { manager } from "../rooms/roomManager";

import { Action } from "./actions";
import {
  adjacentRooms,
  getRoom,
  getRoomModel,
  parseCommand,
  sendMessage
} from "./baseHelpers";

export const usage: Action = {
  move: {
    description: "Move through an unlocked door or any available room",
    uses: [
      {
        example: "!move room a",
        explanation: "Moves to any room that you have visited that is available",
        use: "!move **room a**"
      },
      {
        example: "!move through Door 1",
        explanation: "Moves through an unlocked door. Will be marked as visited",
        use: "!move through **door**"
      }
    ]
  },
  mv: {
    adminOnly: true,
    description: "Forceably moves a user to another room",
    uses: [
      {
        example: "!move user 1 to room a",
        use: "!move **user** to **room**"
      }
    ]
  }
};

async function moveMember(member: GuildMember, target: string, source: string = ""):
                          Promise<void> {

  const roles: string[] = [];

  async function linkHelper(from: string, to: string): Promise<void> {
    const link = await Link.findOne({
      include: [{
        as: "source",
        attributes: ["name"],
        model: RoomModel,
        where: { name: from }
      }, {
        as: "target",
        attributes: ["name"],
        model: RoomModel,
        where: { name: to }
      }]
    });

    if (link !== null) {
      try {
        await link.addVisitor(member.id);
        manager.links.get(from)!.get(to)!.visitors.add(member.id);
      } catch (err) {
        console.error((err as Error).stack);
      }
    }
  }

  for (const [, role] of member.roles.cache) {
    if (!manager.roles.has(role.id)) roles.push(role.id);
  }

  const newRole: Role = guild.roles.cache
    .find(r => r.name === target)!;
  roles.push(newRole.id);

  if (source !== "") {
    await linkHelper(source, target);
    await linkHelper(target, source);
  }

  await member.roles.set(roles);

  if (!member.user.bot) member.send(`You were moved to ${target}`);
}

export async function move(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);

  await lock({ release: false, user: [msg.author.id ]});

  try {
    const command = parseCommand(msg, ["to"]),
    targetName = (command.args.get("to") || []).join(lineEnd),
    targetRoom = await getRoomModel(targetName);

    if (targetRoom === null) {
      sendMessage(msg, `Could not find room ${targetName}`, true);

      return;
    }

    for (const name of command.params) {
      const member = guild.members.cache.find(m =>
        m.displayName === name || m.toString() === name || m.user.username === name)!;

      if (member !== null) {
        await moveMember(member, targetRoom.name);

        sendMessage(msg,
          `Successfully moved ${member.displayName} to ${targetName}`,
          true);
      }
    }
  } catch (err) {
    throw err;
  } finally {
    await lock({ release: true, user: [msg.author.id ]});
  }
}

export async function userMove(msg: CustomMessage): Promise<void> {
  await lock({ release: false, user: [msg.author.id ]});

  try {
    const command = parseCommand(msg, ["through"]),
      member = guild.members.resolve(msg.author.id)!,
      name = command.params.join(),
      roomModel = await getRoom(msg, true);

    if (roomModel === null) throw new ChannelNotFoundError(name);

    const through = command.args.get("through");

    if (through !== undefined) {
      const door: string = through.join(),
        linkList = manager.links.get(roomModel.name);

      if (linkList !== undefined) {
        let targetNeighbor: Undefined<Neighbor>;

        for (const [, neighbor] of linkList.entries()) {
          if (neighbor.name === door) {
            targetNeighbor = neighbor;
            break;
          }
        }

        if (targetNeighbor === undefined) {
          throw new Error("There is no door of that name");
        } else if (targetNeighbor.locked) {
          throw new Error(`Door ${targetNeighbor.name} is locked`);
        } else {
          await moveMember(member, targetNeighbor.to, roomModel.name);

          return;
        }
      } else {
        throw new Error("There are no available neighbors");
      }
    }

    const neighbors: string[] = adjacentRooms(msg),
      targetRoom = await getRoomModel(name);

    if (targetRoom === null) {
      throw new Error("That room does not exist");
    } else if (neighbors.indexOf(targetRoom.name) === -1) {
      throw new Error("You cannot access that room");
    }

    moveMember(member, targetRoom.name);
  } catch (err) {
    throw err;
  } finally {
    await lock({ release: true, user: msg.author.id });
  }
}
