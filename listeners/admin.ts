import * as Discord from 'discord.js';
import moment from 'moment';
import tmp from 'tmp';
import { writeFileSync } from 'fs';
import { mainGuild } from '../helper';
import { Message, User } from '../models/models';

async function showLogs(msg: Discord.Message) {
  let sender: Discord.User = msg.author;
  let channelName: string = "";
  let channelId: string = msg.channel.id;

  if (msg.channel instanceof Discord.TextChannel) {
    channelName = msg.channel.name;
  } else {
    let room: string = msg.content.split(" ")[1];

    if (room !== undefined) {
      let channel: Discord.GuildChannel = mainGuild().channels
        .find(c => c.name === room);
  
      if (channel !== null) {
        channelId = channel.id;
        channelName = channel.name;
      }
    }
  }
  
  let user: User | null = await User.findOne({
    include: [{
      include: [{
        as: 'sender',
        model: User
      }],
      attributes: ["createdAt", "message"],
      model: Message,
      where: {
        channel: channelId
      }
    }],
    order: [[Message, "createdAt", "ASC"]],
    where: {
      id: sender.id
    }
  });

  if (user === null) {
    sender.send("No logs for now");
  } else {
    tmp.file((err, path, _fd, callback) => {
      if (err) throw err;
      if (user === null) return;

      writeFileSync(path, user.Messages.map((message: any) => {
        let name: string = message.sender.name;
        if (message.sender.id === sender.id) {
          name = "You";
        }
        return `${name} (${moment().format("M/DD/YY h:mm A")}): ${message.message}`;
      }).join("\n"));

      sender.send({
        files: [{
          attachment: path,
          name: `${channelName}-log.txt`
        }]
      }).then(() => {
        callback();
      }).catch(err => {
        callback();
      });
    });
  }
}

let actions: {[key: string]: Function} = {
  'log': showLogs
}

export default actions;