import {
  Client,
  Guild,
  GuildMember,
  Message as DiscordMessage,
  TextChannel
} from "discord.js";
import { Op } from "sequelize";

import { config } from "./config/config";
import {
  initGuild,
  initRooms,
  initUsers,
  roomManager
} from "./helpers/base";
import { CustomMessage } from "./helpers/classes";
import { globalLock } from "./helpers/locks";
import { actions } from "./listeners/actions";
import { sendMessage } from "./listeners/baseHelpers";
import { handleSave } from "./listeners/state";
import { initDB, Message, sequelize, User } from "./models/models";
import { Room } from "./rooms/room";
import { RoomManager } from "./rooms/roomManager";

const client = new Client();
let guild: Guild;

function invalid(msg: DiscordMessage): boolean {
  return client.user.id === msg.author.id || (msg.guild !== guild && msg.guild !== null);
}

client.on("ready", async () => {
  guild = client.guilds.find((g: Guild) => g.name === config.guildName);
  initGuild(guild);

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

  const manager = await RoomManager.create("./data/rooms");
  initRooms(manager);
  await initUsers("./data/users");
});

client.on("messageDelete", (msg: DiscordMessage) => {
  if (invalid(msg)) return;

  Message.destroy({
    where: {
      id: msg.id
    }
  });
});

client.on("messageUpdate", async (_old: DiscordMessage, msg: DiscordMessage) => {
  if (invalid(msg)) return;

  return Message.updateFromMsg(msg);
});

client.on("message", async (msg: DiscordMessage) => {
  if (invalid(msg)) return;

  const mesg = msg as CustomMessage;

  const content: string = msg.content;

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

            mesg.overridenSender = msg.author;
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

  const manager = roomManager();

  if (oldMember.displayName !== newMember.displayName) {
    await User.update({
      discordName: newMember.displayName
    }, {
      where: {
        id: newMember.id
      }
    });
  }

  if (oldMember.roles === newMember.roles) return;

  const roomIds: string[] = [],
    roleNames: string[] = [];

  for (const [, role] of newMember.roles) {
    if (!manager.rooms.has(role.name)) {
      return;
    }

    if (!oldMember.roles.has(role.id)) {
      const channel = (manager.rooms.get(role.name) as Room).channel;

      if (channel !== undefined) {
        roomIds.push(channel.id);
        roleNames.push(role.name);
      }
    }
  }
});

initDB()
  .then(async () => {
    try {
      await sequelize.sync();
      await client.login(config.botToken);
    } catch (err) {
      console.error((err as Error).stack);
    }
  })
  .catch((err: Error) => {
    console.error(err);
  });

async function handleExit(): Promise<void> {
  await handleSave();
  process.exit(0);
}

process.on("exit", handleExit);
process.on("SIGINT", handleExit);
process.on("SIGUSR1", handleExit);
process.on("SIGUSR2", handleExit);
