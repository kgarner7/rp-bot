import { CronJob } from "cron";
import {
  Client,
  Guild,
  Message as DiscordMessage,
  Role,
  TextChannel
} from "discord.js";
import { Op } from "sequelize";

import { config } from "./config/config";
import { initUsers, isAdmin, sentToAdmins } from "./helpers/base";
import { CustomMessage } from "./helpers/classes";
import { globalLock } from "./helpers/locks";
import { isNone } from "./helpers/types";
import { actions } from "./listeners/actions";
import { sendMessage } from "./listeners/baseHelpers";
import { toHaiku } from "./listeners/haiku";
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
  return client.user?.id === msg.author.id || (msg.guild !== guild && msg.guild !== null);
}

client.on("ready", async () => {
  guild = client.guilds.cache.find((g: Guild) => g.name === config.guildName)!;
  everyone = guild.roles.everyone;

  const userIds: string[] = [];
  for (const [, member] of guild.members.cache) {
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
      await sentToAdmins(guild, `Could not save: ${err}`);
    }
  });

  job.start();
});

client.on("messageDelete", (msg) => {
  if (!msg.partial) {
    if (invalid(msg)) return;

    triggerRoom(msg, MESSAGE_DELETE);

    Message.destroy({
      where: {
        id: msg.id
      }
    });
  }
});

client.on("messageUpdate", async (_old, msg) => {
  if (!msg.partial) {
    if (invalid(msg)) return;

    triggerRoom(msg, MESSAGE_UPDATE);
  
    return Message.updateFromMsg(msg);
  }
});

client.on("message", async (msg: DiscordMessage) => {
  if (invalid(msg)) return;

  const haiku = toHaiku(msg.content);

  // if (haiku) msg.reply(haiku);

  const content: string = msg.content;
  const member = msg.member || guild.members.resolve(msg.author.id)!;

  const mesg: CustomMessage = {
    author: msg.author,
    channel: msg.channel,
    content,
    member
  };

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
        mesg.content = split.splice(index)
          .join(" ");
      }

      if (message in actions) {
        if (username !== "" && isAdmin(mesg)) {

          const user = await User.findOne({
            where: {
              [Op.or]: [
                { discordName: username },
                { name: username }
              ]
            }
          });

          if (user !== null) {
            const overrideUser = guild.members.resolve(user.id);

            if (overrideUser) {
              const sender = guild.members.resolve(msg.author.id);
              mesg.overridenSender = sender!;
              mesg.author = overrideUser.user;
              mesg.member = overrideUser;
            } else {
              console.log(`could not resolve ${ user.id }`)
            }
          }
        }

        await globalLock({ acquire: true, writer: false });
        await actions[message](mesg);
      }
    } catch (err) {
      sendMessage(mesg, (err as Error).message, true);
      console.error((err as Error).stack);
    } finally {
      await globalLock({ acquire: false, writer: false });
    }
  } 

  if (msg.channel instanceof TextChannel) {
    await Message.createFromMsg(msg);
  }
});

client.on("guildMemberAdd", async (member) => {
  if (!member.partial) {
    await User.createFromMember(member);
  }
});

client.on("guildMemberUpdate",async (oldMember, newMember) => {
  if (!newMember.partial) {

    if (oldMember.displayName !== newMember.displayName) {
      await User.update({
        discordName: newMember.displayName
      }, {
        where: {
          id: newMember.id
        }
      });
    }
  
    if (oldMember.roles.cache.equals(newMember.roles.cache)) return;
  
    const json = await getRooms(newMember);
    triggerUser(newMember, ROOM_INFORMATION, JSON.stringify(json));
  }
});
