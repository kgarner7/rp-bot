import * as Discord from 'discord.js';
const { sequelize, Message, User } = require("../models/index");

async function showLogs(msg: Discord.Message) {
  let sender: Discord.GuildMember = msg.member;
  let user = await User.findOne({
    include: {
      include: {
        as: 'sender',
        model: User
      },
      attributes: ["createdAt", "message"],
      model: Message,
      where: {
        channel: msg.channel.id
      }
    },
    order: [[Message, "createdAt", "ASC"]],
    where: {
      name: sender.user.username
    }
  });

  sender.sendMessage(user.messages.map((message: any) => {
    return `${message.createdAt}${message.message}`;
  }).join("\n"));
}

module.exports.actions = {
  'log': showLogs
}