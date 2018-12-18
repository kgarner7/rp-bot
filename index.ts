import * as Discord from 'discord.js';
import { init } from "./helper";
import AdminActions from './listeners/admin';
import sequelize, { Message, User } from "./models/models";
import { config } from "./config/config";
import { InvalidCommandError } from './config/errors';

const client = new Discord.Client();
let guild: Discord.Guild;

function isMe(msg: Discord.Message) {
  return client.user.id === msg.author.id;
}

client.on("ready", () => {
  guild = client.guilds.find((g: Discord.Guild) => g.name === config.guildName);
  init(guild);

  guild.members.forEach((member: Discord.GuildMember) => {
    User.createFromMember(member);
  });
});

client.on("messageDelete", (msg: Discord.Message) => {
  Message.destroy({
    where: {
      id: msg.id
    }
  });
});

client.on("messageUpdate", async (_old: Discord.Message, msg: Discord.Message) => {
  if (isMe(msg)) return;
  

  return Message.updateFromMsg(msg);
});

client.on('message', async (msg: Discord.Message) => {
  if (isMe(msg)) return;
  
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

sequelize.sync({force: true}).then(() => {
  client.login(config.botToken);
});