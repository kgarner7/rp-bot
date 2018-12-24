import * as Discord from 'discord.js';
import { initGuild, initRooms } from './helper';
import AdminActions from './listeners/admin';
import sequelize, { Message, Room, User } from './models/models';
import { config } from './config/config';
import { InvalidCommandError } from './config/errors';
import { RoomManager } from './rooms/roomManager';

const client = new Discord.Client();
let guild: Discord.Guild;

function invalid(msg: Discord.Message) {
  return client.user.id === msg.author.id || 
    (msg.guild !== guild && msg.guild !== null);
}

client.on("ready", async () => {
  guild = client.guilds.find((g: Discord.Guild) => g.name === config.guildName);
  initGuild(guild);

  guild.members.forEach((member: Discord.GuildMember) => {
    User.createFromMember(member);
  });

  let begin = __filename.endsWith(".js") ? "dist/": "";
  let manager = await RoomManager.create(`./${begin}rooms/custom`);
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
      console.log(`command: ${command}`)
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

sequelize.sync().then(() => {
  client.login(config.botToken);
});