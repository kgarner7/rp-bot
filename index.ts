import {
  Client,
  Guild,
  GuildMember,
  Message as DiscordMessage,
  TextChannel
} from "discord.js";
import { Op } from "sequelize";

import { config } from "./config/config";
import { InvalidCommandError } from "./config/errors";
import { initGuild, initRooms } from "./helpers/base";
import { actions } from "./listeners/actions";
import { sendMessage } from "./listeners/baseHelpers";
import { initDB, Message, sequelize, User } from "./models/models";
import { Room } from "./rooms/room";
import { RoomManager } from "./rooms/roomManager";

const client = new Client();
let guild: Guild,
  manager: RoomManager;

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

  const begin = __filename.endsWith(".js") ? "dist/" : "";
  manager = await RoomManager.create(`./${begin}rooms/custom`);
  initRooms(manager);
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

  const content: string = msg.content;

  if (content.startsWith(config.prefix)) {
    let endIndex = content.indexOf(" ");
    if (endIndex === -1) endIndex = content.length;

    const command = msg.content.substring(1, endIndex);

    if (msg.deletable) await msg.delete();

    try {
      if (command in actions) {
        await actions[command](msg);
      } else {
        throw new InvalidCommandError(command);
      }
    } catch (err) {
      sendMessage(msg, (err as Error).message, true);
      console.error((err as Error).stack);
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
