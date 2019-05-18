import { User as DiscordUser } from "discord.js";
import { writeFileSync } from "fs";
import moment from "moment";
import { Op } from "sequelize";
import tmp from "tmp";

import {  NoLogError } from "../config/errors";
import { mainGuild, requireAdmin } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";
import { Null } from "../helpers/types";
import { Link, Message as MessageModel, Room as RoomModel, User } from "../models/models";

import { Action } from "./actions";
import {
  currentRoom,
  getRoom,
  getRoomName
} from "./baseHelpers";

export const usage: Action = {
  log: {
    description: "View a transcript of the chats in a room",
    uses: [
      { explanation: "gets the log in your current room", use: "!log" },
      {
        example: "!log in room a",
        explanation: "gets the log for a specific room",
        use: "!log in **room**"
      }
    ]
  },
  users: {
    adminOnly: true,
    description: "gets information on all users",
    uses: [
      { use: "!users" }
    ]
  },
  who: {
    description: "Gets all users in a room",
    uses: [
      { use: "!who" },
      {
        admin: true,
        use: "!who in **room**"
      }
    ]
  }
};

/**
 * Gets all the current individuals in a room
 * @param msg the message to be evaluated
 */
export async function members(msg: CustomMessage): Promise<void> {
  const guild = mainGuild(),
    room = await getRoom(msg, true);

  if (room === null) {
    msg.author
      .send("Either you do not have access to this room, or that room does not exist");
  } else {
    let memberString = "";
    const memberList = guild.roles.find(r => r.name === room.name).members;

    if (memberList.size === 0) {
      msg.channel.send(`There is no one in the ${room.name}`);

      return;
    }

    for (const [, member] of memberList.sort()) {
      if (member.user.bot || member.id === guild.ownerID) continue;

      memberString += `${member}, `;
    }

    memberString = memberString.substring(0, memberString.length - 2);

    msg.channel.send(`The following people are in ${room.name}: ${memberString}`);
  }
}

/**
 * Shows the logs for a channel.
 * If this is called in a TextChannel, sends the logs of that channel.
 * If called in a DM, sends the logs of a particular channel
 * @param msg the message we are handling
 */
export async function showLogs(msg: CustomMessage): Promise<void> {
  const sender: DiscordUser = msg.author;

  /**
   * A helper function for getting a room and all messages by date
   * @param nameOrDiscordName the name of the room
   */
  async function getChannel(nameOrDiscordName: string): Promise<Null<RoomModel>> {
    return RoomModel.findOne({
      include: [{
        attributes: ["createdAt", "message"],
        include: [{
          model: User,
          where: {
            id: sender.id
          }
        }, {
          as: "Sender",
          model: User
        }],
        model: MessageModel
      }],
      order: [[MessageModel, "createdAt", "ASC"]],
      where: {
        [Op.or]: [
          { discordName: nameOrDiscordName },
          { name: nameOrDiscordName }
        ]
      }
    });
  }

  let channelName = getRoomName(msg),
    name: string,
    warning: Null<string> = null;

  if (channelName === null) {
    throw new NoLogError(msg);
  } else {
    name = channelName.name;
  }

  let room = await getChannel(name);

  if (room === null && channelName.user) {
    warning = `Could not find user requested room ${name}`;
    channelName = getRoomName(msg, true);

    if (channelName === null) throw new NoLogError(msg);

    name = channelName.name;
    room = await getChannel(name);
  }

  if (warning) msg.author.send(warning);

  if (room === null) {
    throw new NoLogError(msg);
  } else {
    tmp.file((err, path, _fd, callback) => {
      if (err || room === null) return;

      writeFileSync(path, room.Messages.map(message => {
        let senderName: string = message.Sender.name;

        if (message.Sender.id === sender.id) senderName = "You";

        const timeString: string =
          moment(message.createdAt)
          .format("M/DD/YY h:mm A");

        return `${senderName} (${timeString}): ${message.message}`;
      })
      .join("\n"));

      sender.send({
        files: [{
          attachment: path,
          name: `${name}-log.txt`
        }]
      })
      .then(() => {
        callback();
      })
      .catch(_err => {
        callback();
      });
    });
  }
}

export async function users(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);

  const guild = mainGuild();
  let message = "";

  const memberList = await User.findAll({
    attributes: ["id", "inventory", "name"],
    include: [{
      as: "visitedLinks",
      attributes: ["locked"],
      include: [{
        as: "source",
        attributes: ["name"],
        model: RoomModel
      }, {
        as: "target",
        attributes: ["name"],
        model: RoomModel
      }],
      model: Link
    }],
    order: [
      ["name", "ASC"]
    ]
  });

  for (const member of memberList) {
    if (member.id === guild.owner.id) {
      continue;
    }

    const guildMember = guild.members.get(member.id)!;

    const room = currentRoom(guildMember),
      visitedRooms: Set<string> = new Set(room === null ? [] : [room]);
    let visitedString = room === null ? "" : room + ", ";

    const roomString: string = room === undefined ?
      "Not in any room" : `Currently in: ${room}`;

    for (const link of member.visitedLinks) {
      const source = link.source.name,
        target = link.target.name;

      if (!visitedRooms.has(source)) {
        visitedRooms.add(source);
        visitedString += source + ", ";
      }

      if (!visitedRooms.has(target)) {
        visitedRooms.add(target);
        visitedString += target + ", ";
      }
    }

    visitedString = visitedString.substr(0, visitedString.length - 2);

    if (visitedString.length === 0) visitedString = "No rooms visited";

    let itemString = "Inventory:";

    for (const item of Object.values(member.inventory)) {
      itemString += `\n**${item.name}**: ${item.description} (${item.quantity})`;
    }

    if (itemString === "Inventory:") itemString = "Inventory: none";

    message += `${guildMember}\n${roomString}\n${visitedString}\n${itemString}\n`;
  }

  msg.author.send(message);
}
