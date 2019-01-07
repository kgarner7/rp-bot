import { GuildMember, Message as DiscordMessage, Role } from "discord.js";

import { ChannelNotFoundError } from "../config/errors";
import { mainGuild, requireAdmin, roomManager } from "../helpers/base";
import { Link, Room as RoomModel } from "../models/models";
import { Neighbor } from "../rooms/room";
import { RoomManager } from "../rooms/roomManager";

import {
  adjacentRooms,
  getRoom,
  getRoomModel,
  parseCommand,
  sendMessage
} from "./baseHelpers";

async function moveMember(member: GuildMember, target: string, source: string = ""):
                          Promise<void> {

  const manager: RoomManager = roomManager(),
    roles: string[] = [];

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

  for (const [, role] of member.roles) {
    if (!manager.roles.has(role.id)) roles.push(role.id);
  }

  const newRole: Role = mainGuild().roles
    .find(r => r.name === target);
  roles.push(newRole.id);

  if (source !== "") {
    await linkHelper(source, target);
    await linkHelper(target, source);
  }

  await member.setRoles(roles);
}

export async function move(msg: DiscordMessage): Promise<void> {
  requireAdmin(msg);

  const command = parseCommand(msg, ["to"]),
    guild = mainGuild(),
    targetName = (command.args.get("to") || []).join("\n"),
    targetRoom = await getRoomModel(targetName);

  if (targetRoom === null) {
    sendMessage(msg, `Could not find room ${targetName}`, true);

    return;
  }

  for (const name of command.params) {
    const member = guild.members.find(m =>
      m.displayName === name || m.toString() === name);

    if (member !== null) {
      await moveMember(member, targetRoom.name);

      if (!member.user.bot) member.send(`You were moved to ${targetName}`);

      sendMessage(msg,
        `Successfully moved ${member.displayName} to ${targetName}`,
        true);
    }
  }
}

export async function userMove(msg: DiscordMessage): Promise<void> {
  const command = parseCommand(msg, ["through"]),
    guild = mainGuild(),
    manager = roomManager(),
    member = guild.members.get(msg.author.id)!,
    name = command.params.join(),
    roomModel = await getRoom(msg, true);

  if (roomModel === null) throw new ChannelNotFoundError(name);

  const through = command.args.get("through");

  if (through !== undefined) {
    const door: string = through.join(),
      linkList = manager.links.get(roomModel.name);

    if (linkList !== undefined) {
      let targetNeighbor: Neighbor | undefined;

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
}
