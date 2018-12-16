const Discord = require("discord.js");
const client = new Discord.Client();
const { sequelize, Message, User } = require("./models/index");

client.on("ready", () => {
  client.users.forEach(user => {
    if (user.bot !== true) {
      User.findOrCreate({
        defaults: {
          id: user.id
        },
        where: {
          name: user.username
        }
      });
    }
  });
});

client.on("messageDelete", msg => {
  Message.destroy({
    where: {
      id: msg.id
    }
  });
});

client.on("messageUpdate", async (_old, msg) => {
  return Message.updateFromMsg(msg);
});

client.on('message', msg => {
  return Message.createFromMsg(msg);
});

sequelize.sync().then(res => {
  client.login(process.env.BOT_TOKEN);
});

async function createRoom(name) {
  let guild = client.guilds.first();
  let role = await guild.createRole({
    name: name,
    color: 'RANDOM'
  });

  let everyone = guild.roles.find(v => v.name === "@everyone").id;

  await guild.createChannel(name, 'text', [{
    allow: ["READ_MESSAGES", "SEND_MESSAGES"],
    type: 'role',
    id: role.id
  }, {
    id: everyone,
    deny: ["READ_MESSAGES", "READ_MESSAGE_HISTORY", "SEND_MESSAGES"],
    type: 'role'
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

async function deleteRoom(name) {
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