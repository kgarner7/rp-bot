import { writeFileSync } from "fs";

import { User as DiscordUser } from "discord.js";
import moment from "moment";
import { Op } from "sequelize";
import tmp from "tmp";

import { guild } from "../client";
import {  NoLogError } from "../config/errors";
import { lineEnd, requireAdmin, userIsAdmin } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";
import { Null } from "../helpers/types";
import { Link, Message as MessageModel, Room as RoomModel, User } from "../models/models";

import { Action } from "./actions";
import {
  currentRoom,
  getRoom,
  getRoomName,
  sendMessage,
  ignorePromise
} from "./baseHelpers";

export const usage: Action = {
  log: {
    description: "View a transcript of the chats in a room",
    uses: [{
      explanation: "gets the log in your current room",
      use: "!log"
    }, {
      example: "!log in room a",
      explanation: "gets the log for a specific room",
      use: "!log in **room**"
    }]
  },
  users: {
    adminOnly: true,
    description: "gets information on all users",
    uses: [{
      use: "!users"
    }]
  },
  who: {
    description: "Gets all users in a room",
    uses: [{
      use: "!who"
    }, {
      admin: true,
      use: "!who in **room**"
    }]
  }
};

/**
 * Gets all the current individuals in a room
 * Implementation for the !who command
 * @param msg the message to be evaluated
 */
export async function members(msg: CustomMessage): Promise<void> {
  const room = await getRoom(msg, true);

  if (room === null) {
    ignorePromise(msg.author
      .send("Either you do not have access to this room, or that room does not exist"));
  } else {
    let memberString = "";
    const memberList = guild.roles.cache.find(r => r.name === room.name)?.members;

    if (!memberList || memberList.size === 0) {
      ignorePromise(msg.channel.send(`There is no one in the ${room.name}`));

      return;
    }

    for (const [, member] of memberList.sort()) {
      if (member.user.bot || userIsAdmin(member)) continue;

      memberString += `${member}, `;
    }

    memberString = memberString.substring(0, memberString.length - 2);

    ignorePromise(msg.channel.send(`The following people are in ${room.name}: ${memberString}`));
  }
}

/**
 * Shows the logs for a channel.
 * If this is called in a TextChannel, sends the logs of that channel.
 * If called in a DM, sends the logs of a particular channel.
 * Implementation for the !logs command
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
          required: true,
          where: {
            id: sender.id
          }
        }, {
          as: "Sender",
          model: User
        }],
        model: MessageModel,
        required: false
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

  if (warning) {
    ignorePromise((msg.overridenSender || sender).send(warning));
  }

  if (room === null) {
    throw new NoLogError(msg);
  } else {
    if (room.Messages.length === 0) {
      sendMessage(msg, `You have no logs for the room ${name}`, true);
    } else {
      tmp.file((err, path, _fd, callback) => {
        if (err || room === null) return;

        writeFileSync(path, room.Messages.map(message => {
          let senderName: string = message.Sender.discordName;

          if (message.Sender.id === sender.id) senderName = "You";

          const timeString: string =
            moment(message.createdAt)
              .format("M/DD/YY h:mm A");

          return `${senderName} (${timeString}): ${message.message}`;
        })
          .join(lineEnd));

        (msg.overridenSender || sender).send({
          files: [{
            attachment: path,
            name: `${name}-log.txt`
          }]
        })
          .then(() => {
            callback();
          })
          .catch(error => {
            console.error(error);
            callback();
          });
      });
    }
  }
}

/**
 * Gets information about all of the users currently in the server
 * Implementation for the !users command
 * @param msg the message we are handling
 */
export async function users(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);

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
    const guildMember = guild.members.resolve(member.id);

    if (!guildMember) {
      continue;
    } else if (guildMember.permissions.has("ADMINISTRATOR") && !guildMember.user.bot) {
      continue;
    }

    const room = currentRoom(guildMember),
      visitedRooms: Set<string> = new Set(room === null ? [] : [room]);
    let visitedString = room === null ? "" : `${room  }, `;

    const roomString: string = room === undefined ?
      "Not in any room" : `Currently in: ${room}`;

    for (const link of member.visitedLinks) {
      const source = link.source.name,
        target = link.target.name;

      if (!visitedRooms.has(source)) {
        visitedRooms.add(source);
        visitedString += `${source  }, `;
      }

      if (!visitedRooms.has(target)) {
        visitedRooms.add(target);
        visitedString += `${target  }, `;
      }
    }

    visitedString = visitedString.substr(0, visitedString.length - 2);

    if (visitedString.length === 0) visitedString = "No rooms visited";

    let itemString = "Inventory:";

    for (const item of Object.values(member.inventory)) {
      itemString += `${lineEnd}**${item.name}** (${item.quantity})`;
    }

    if (itemString === "Inventory:") itemString = "Inventory: none";

    message += [guildMember, roomString, visitedString, itemString].join(lineEnd)
      + lineEnd;
  }

  sendMessage(msg, message, true);
}
