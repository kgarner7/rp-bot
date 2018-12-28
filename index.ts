import * as Discord from 'discord.js';
import { initGuild, initRooms } from './helper';
import AdminActions from './listeners/admin';
import sequelize, { initDB, Message, Room, User } from './models/models';
import { config } from './config/config';
import { InvalidCommandError } from './config/errors';
import { RoomManager } from './rooms/roomManager';
import { Op } from 'sequelize';

const client = new Discord.Client();
let guild: Discord.Guild;
let manager: RoomManager;

function invalid(msg: Discord.Message) {
  return client.user.id === msg.author.id ||
    (msg.guild !== guild && msg.guild !== null);
}

client.on("ready", async () => {
  guild = client.guilds.find((g: Discord.Guild) => g.name === config.guildName);
  initGuild(guild);

  let userIds: string[] = [];
  for (let items of guild.members) {
    let member = items[1];
    let user = await User.createFromMember(member);

    if (user) {
      userIds.push(user[0].id);
    }
  }

  User.destroy({
    where: {
      id: {
        [Op.not]: userIds
      }
    }
  });

  let begin = __filename.endsWith(".js") ? "dist/": "";
  manager = await RoomManager.create(`./${begin}rooms/custom`);
  initRooms(manager);
});

client.on("messageDelete", (msg: Discord.Message) => {
  if (invalid(msg)) return;

  Message.destroy({
    where: {
      id: msg.id
    }
  });
});

client.on("messageUpdate", async (_old: Discord.Message, msg: Discord.Message) => {
  if (invalid(msg)) return;


  return Message.updateFromMsg(msg);
});

client.on("message", async (msg: Discord.Message) => {
  if (invalid(msg)) return;

  let content: string = msg.content;

  if (content.startsWith(config.prefix)) {
    let endIndex = content.indexOf(" ");
    if (endIndex === -1) endIndex = content.length;

    let command = msg.content.substring(1, endIndex);

    try {
      if (command in AdminActions) {
        await AdminActions[command](msg);
      }
      else {
        throw new InvalidCommandError(command);
      }
    } catch(err) {
      msg.author.send(err.message);
    } finally {
      if (msg.deletable) {
        await msg.delete();
      }
    }

  } else if (msg.channel instanceof Discord.TextChannel) {
    await Message.createFromMsg(msg);
  }
});

client.on("guildMemberUpdate", 
  (oldMember: Discord.GuildMember, newMember: Discord.GuildMember) => {

  if (oldMember.roles === newMember.roles) {
    return;
  }

  let newRoles: string[] = [];
  newMember.roles.forEach((r: Discord.Role) => {
    if (!(r.name in manager.rooms)) {
      return;
    } 

    if (!oldMember.roles.has(r.id)) {
      newRoles.push(r.id);
    }
  });

  console.log(newRoles);
}); 

initDB().then(async () => {
  try {
    await sequelize.sync({ force: true });
    await client.login(config.botToken);
  } catch(err) {
    console.error((err as Error).stack);
  }
});