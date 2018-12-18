import * as Discord from 'discord.js';
import moment from 'moment';
import tmp from 'tmp';
import { writeFileSync } from 'fs';
import { mainGuild, requireAdmin } from '../helper';
import { Message, User } from '../models/models';
import { 
  AccessError,
  ChannelNotFoundError,
  ExistingChannelError,
  NoLogError 
} from '../config/errors';

/**
 * Shows the logs for a channel. 
 * If this is called in a TextChannel, sends the logs of that channel. 
 * If called in a DM, sends the logs of a particular channel
 * @param {Discord.Message} msg the message we are handling
 */
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
    throw new NoLogError(msg);
  } else {
    tmp.file((err, path, _fd, callback) => {
      if (err || user === null) return;

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

/**
 * Creates a private room and role
 * @param {Discord.Message} msg the message we are processing
 * @throws {AccessError}
 * @throws {ExistingChannelError}
 */
async function createRoom(msg: Discord.Message) {
  requireAdmin(msg);
  let name: string = msg.content.split(" ")[1] || "";
  let guild: Discord.Guild = mainGuild();

  if (name === "" || guild.channels.find(c => c.name === name)) {
    throw new ExistingChannelError(name);
  }

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
  await msg.author.send(`Successfully created room ${name}`);
}

/**
 * Attempts to destory an existing private room and role
 * @param {Discord.Message} msg the message we are handling
 * @throws {AccessError}
 * @throws {ChannelNotFoundError}
 */
async function deleteRoom(msg: Discord.Message) {
  requireAdmin(msg);
  let guild: Discord.Guild = mainGuild();
  let name: string = msg.content.split(" ")[1] || "";
  let channel = guild.channels
    .find(v => v.name === name);

  if (channel === null || !(channel instanceof Discord.TextChannel)) throw new ChannelNotFoundError(name);

  let role: Discord.Role = guild.roles
    .find(c => c.id === channel.permissionOverwrites
    .find(p => p.deny === 0).id);

  if (role === null) throw new ChannelNotFoundError(name);
  
  try {
    await channel.delete();
    await role.delete();
    msg.author.send(`Successfully deleted room ${name}`);
  } catch(err) {
    throw err;
  }
}

/**
 * A mapping of administrative actions to functions
 */
let actions: {[key: string]: Function} = {
  'create-room': createRoom,
  'delete-room': deleteRoom,
  'log': showLogs
}

export default actions;