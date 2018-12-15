const Discord = require("discord.js");
const client = new Discord.Client();
const { database, Message, User } = require("./db/database");

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
  let message = await Message.findOne({
    include: {
      model: User
    },
    where: {
      id: msg.id
    }
  });
  
  let transaction = await database.transaction();

  try {
    await message.setUsers(getMembers(msg), {
      transaction: transaction
    });

    message.message = msg.content;
    await message.save({transaction: transaction});
    await transaction.commit();
  } catch(err) {
    await transaction.rollback();
  }
});

function getMembers(msg) {
  let users = [];

  for (let member of msg.channel.members) {
    let user = member[1].user;
    if (user.bot !== true) {
      users.push(user.id);
    }
  }

  return users;
}

client.on('message', async msg => {
  let transaction = await database.transaction();
  let users = getMembers(msg);

  try {
    let message = await Message.create({
      id: msg.id,
      message: msg.content
    }, {
      transaction: transaction
    });

    await message.addUsers(users, {transaction: transaction});
    transaction.commit();
  } catch(err) {
    await transaction.rollback();
  }
})

database.sync().then(res => {
  client.login(process.env.BOT_TOKEN);
});