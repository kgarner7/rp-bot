import { CronJob } from "cron";
import {
  Client,
  Guild,
  GuildMember,
  Message as DiscordMessage,
  Role,
  TextChannel
} from "discord.js";
import { Op } from "sequelize";

import { config } from "./config/config";
import { initUsers } from "./helpers/base";
import { CustomMessage } from "./helpers/classes";
import { globalLock } from "./helpers/locks";
import { isNone } from "./helpers/types";
import { actions } from "./listeners/actions";
import { sendMessage } from "./listeners/baseHelpers";
import { handleSave } from "./listeners/state";
import { Message, User } from "./models/models";
import { RoomManager } from "./rooms/roomManager";
import {
  MESSAGE_CREATE,
  MESSAGE_DELETE,
  MESSAGE_UPDATE,
  ROOM_INFORMATION
} from "./socket/consts";
import { getRooms, triggerRoom, triggerUser } from "./socket/helpers";

export const client = new Client();
export let guild: Guild;
export let everyone: Role;

/**
 * Determines whether the message belongs to this guild and was not sent by the bot
 * @returns true if the author is a bot or the message was in a different guild
 */
function invalid(msg: DiscordMessage): boolean {
  return client.user.id === msg.author.id || (msg.guild !== guild && msg.guild !== null);
}

client.on("ready", async () => {
  guild = client.guilds.find((g: Guild) => g.name === config.guildName);
  everyone = guild.roles.find(r => r.name === "@everyone");

  const userIds: string[] = [];
  for (const [, member] of guild.members) {
    const user = await User.createFromMember(member);

    if (user) userIds.push(user[0].id);
  }

  User.destroy({
    where: {
      id: {
        [Op.not]: userIds
      }
    }
  });

  await RoomManager.create("./data/rooms");
  await initUsers("./data/users");

  const job = new CronJob("0 * * * * *", async (): Promise<void> => {
    try {
      await handleSave();
    } catch (err) {
      guild.owner.send(`Could not save: ${err}`);
    }
  });

  job.start();
});

client.on("messageDelete", (msg: DiscordMessage) => {
  if (invalid(msg)) return;

  triggerRoom(msg, MESSAGE_DELETE);

  Message.destroy({
    where: {
      id: msg.id
    }
  });
});

client.on("messageUpdate", async (_old: DiscordMessage, msg: DiscordMessage) => {
  if (invalid(msg)) return;

  triggerRoom(msg, MESSAGE_UPDATE);

  return Message.updateFromMsg(msg);
});

client.on("message", async (msg: DiscordMessage) => {
  if (invalid(msg)) return;

  const mesg = msg as CustomMessage,
    content: string = msg.content;

  triggerRoom(msg, MESSAGE_CREATE);

  if (content.startsWith(config.prefix)) {
    let endIndex = content.indexOf(" ");
    if (endIndex === -1) endIndex = content.length;

    let message = msg.content.substring(1, endIndex),
      username = "";

    try {
      if (message.startsWith("as")) {
        const split = msg.content.split(" ")
          .splice(1);

        let index = 0;
        for (const part of split) {
          if (part.startsWith("!")) break;

          username += ` ${part}`;
          index++;
        }

        username = username.substr(1);

        message = split[index].substr(1);
        msg.content = split.splice(index)
          .join(" ");
      }

      if (isNone(mesg.member)) {
        mesg.member = guild.members.get(mesg.author.id)!;
      }

      if (message in actions) {
        if (username !== "" && msg.author.id === guild.ownerID) {

          const user = await User.findOne({
            where: {
              [Op.or]: [
                { discordName: username },
                { name: username }
              ]
            }
          });

          if (user !== null) {
            const overrideUser = guild.members.get(user.id)!;

            mesg.overridenSender = msg.member;
            mesg.author = overrideUser.user;
            mesg.member = overrideUser;
          }
        }

        await globalLock({ acquire: true, writer: false });
        await actions[message](mesg);
      }
    } catch (err) {
      sendMessage(msg, (err as Error).message, true);
      console.error((err as Error).stack);
    } finally {
      await globalLock({ acquire: false, writer: false });
    }
  } else if (msg.channel instanceof TextChannel) {
    await Message.createFromMsg(msg);
  }
});

client.on("guildMemberAdd", async (member: GuildMember) => {
  await User.createFromMember(member);
});

client.on("guildMemberUpdate",
  async (oldMember: GuildMember, newMember: GuildMember) => {

  if (oldMember.displayName !== newMember.displayName) {
    await User.update({
      discordName: newMember.displayName
    }, {
      where: {
        id: newMember.id
      }
    });
  }

  if (oldMember.roles.equals(newMember.roles)) return;

  const json = await getRooms(newMember);
  triggerUser(newMember, ROOM_INFORMATION, JSON.stringify(json));
});
