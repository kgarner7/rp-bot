import { GuildMember, Role, TextChannel } from "discord.js";
import { Op } from "sequelize";

import { guild } from "../client";
import { ChannelNotFoundError } from "../config/errors";
import { lineEnd, requireAdmin } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";
import { lock, unlock } from "../helpers/locks";
import { Link, Room as RoomModel, User as UserModel, RoomVisitation } from "../models/models";

import { Action } from "./actions";
import {
  adjacentRooms,
  getRoom,
  getRoomModel,
  parseCommand,
  sendMessage,
  ignorePromise
} from "./baseHelpers";

export const usage: Action = {
  move: {
    description: "Move through an unlocked door or any available room",
    uses: [{
      example: "!move room a",
      explanation: "Moves to any room that you have visited that is available",
      use: "!move **room a**"
    }, {
      example: "!move through Door 1",
      explanation: "Moves through an unlocked door. Will be marked as visited",
      use: "!move through **door**"
    }]
  },
  mv: {
    adminOnly: true,
    description: "Forceably moves a user to another room",
    uses: [{
      example: "!mv user 1 to room a",
      use: "!mv **user** to **room**"
    }]
  }
};

export async function moveMember(member: GuildMember, target: string, source = ""):
Promise<void> {

  const roles: string[] = [];

  async function linkHelper(from: string, to: string): Promise<void> {
    const link = await Link.findOne({
      include: [{
        as: "source",
        attributes: ["id", "name"],
        model: RoomModel,
        where: { name: from }
      }, {
        as: "target",
        attributes: ["id", "name"],
        model: RoomModel,
        where: { name: to }
      }]
    });

    if (link) {
      try {
        await link.addVisitor(member.id);
      } catch (error) {
        console.error((error as Error).stack);
      }
    }
  }

  const newRole: Role = guild.roles.cache.find(r => r.name === target)!;

  roles.push(newRole.id);

  if (source !== "") {
    await linkHelper(source, target);
    await linkHelper(target, source);
  }

  await member.roles.set(roles);

  const channelIds: string[] = [];

  for (const [, channel] of guild.channels.cache) {
    if (channel instanceof TextChannel && channel.members.has(member.id)) {
      channelIds.push(channel.id);
    }
  }

  const possibleRooms = await RoomModel.findAll({
    attributes: ["id"],
    include: [{
      as: "visitors",
      model: UserModel,
      required: false,
      where: {
        id: member.id
      }
    }],
    where: {
      id: {
        [Op.or]: channelIds
      }
    }
  });

  for (const room of possibleRooms) {
    if (room.visitors.length === 0) {
      await RoomVisitation.findOrCreate({
        where: {
          RoomId: room.id,
          UserId: member.id
        }
      });
    }
  }

  if (!member.user.bot) {
    ignorePromise(member.send(`You were moved to ${target}`));
  }
}

export async function move(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);

  const redlock = await lock({ user: [msg.author.id ]});

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
  } catch (error) {
    throw error;
  } finally {
    await unlock(redlock);
  }
}

export async function userMove(msg: CustomMessage): Promise<void> {
  const redlock = await lock({ user: [msg.author.id ]});

  try {
    const command = parseCommand(msg, ["through"]);
    const member = guild.members.resolve(msg.author.id)!;
    const name = command.params.join();
    const roomModel = await getRoom(msg, true);

    if (roomModel === null) throw new ChannelNotFoundError(name);

    const through = command.args.get("through");

    if (through !== undefined) {
      const door = through.join();
      const links = await roomModel.getSources({
        include: [{
          as: "target",
          model: RoomModel
        }]
      });

      if (links.length > 0) {
        const targetLink = links.find(link => link.name === door);

        if (!targetLink) {
          throw new Error("There is no door of that name");
        } else if (targetLink.locked) {
          throw new Error(`Door ${targetLink.name} is locked`);
        } else {
          await moveMember(member, targetLink.target.name, roomModel.name);

          return;
        }
      } else {
        throw new Error("There are no available neighbors");
      }
    }

    const neighbors: string[] = await adjacentRooms(msg);
    const targetRoom = await getRoomModel(name);

    if (!targetRoom) {
      throw new Error("That room does not exist");
    } else if (!neighbors.includes(targetRoom.name)) {
      throw new Error("You cannot access that room");
    }

    await moveMember(member, targetRoom.name);
  } catch (error) {
    throw error;
  } finally {
    await unlock(redlock);
  }
}
