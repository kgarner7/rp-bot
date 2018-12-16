import * as Discord from 'discord.js';
import { init } from "./helper";
const client = new Discord.Client();
const { sequelize, Message, User } = require("./models/index");
let guild: Discord.Guild;

client.on("ready", () => {
  guild = client.guilds.find((g: Discord.Guild) => g.name === process.env.GUILD_NAME);
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
  return Message.updateFromMsg(msg);
});

client.on('message', (msg: Discord.Message) => {
  return Message.createFromMsg(msg);
});

sequelize.sync().then(() => {
  client.login(process.env.BOT_TOKEN);
});

async function createRoom(name: string) {
  let guild: Discord.Guild = client.guilds.first();
  let role: Discord.Role = await guild.createRole({
    name: name,
    color: 'RANDOM'
  });

  let everyone: string = guild.roles.find(v => v.name === "@everyone").id;

  await guild.createChannel(name, 'text', [{
    allow: ["READ_MESSAGES", "SEND_MESSAGES"],
    id: role.id
  }, {
    id: everyone,
    deny: ["READ_MESSAGES", "READ_MESSAGE_HISTORY", "SEND_MESSAGES"],
  }]);
}

// var user;User.findOne({
//   include: {
//     attributes: ["message"],
//     model: Message,
//     where: {
//       channelName: "channel-2"
//     }
//   },
//   order: [[ Message, "createdAt", "ASC"]],
//   where: {
//     name: "lavioso"
//   }
// }).then(u => console.log(u.messages));

async function deleteRoom(name: string) {
  console.log(`Deleting ${name}`);
  let guild = client.guilds.first();
  let channel = await guild.channels.find(v => v.name === name.toLowerCase().replace(/\ /g, "-"));
  let role = await guild.roles
    .find(v => v.name === name);

  if (channel !== null) {
    await channel.delete();
  }

  if (role !== null) {
    await role.delete();
  }
}