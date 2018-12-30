import { 
  Client,
  Guild,
  GuildMember,
  Message as DiscordMessage,
  Role,
  TextChannel
} from 'discord.js';
import { initGuild, initRooms } from './helper';
import AdminActions from './listeners/admin';
import sequelize, { initDB, Message, Room, User } from './models/models';
import { config } from './config/config';
import { InvalidCommandError } from './config/errors';
import { RoomManager } from './rooms/roomManager';
import { Op } from 'sequelize';

const client = new Client();
let guild: Guild;
let manager: RoomManager;

function invalid(msg: DiscordMessage) {
  return client.user.id === msg.author.id ||
    (msg.guild !== guild && msg.guild !== null);
}

client.on("ready", async () => {
  guild = client.guilds.find((g: Guild) => g.name === config.guildName);
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

  let content: string = msg.content;

  if (content.startsWith(config.prefix)) {
    let endIndex = content.indexOf(" ");
    if (endIndex === -1) endIndex = content.length;

    let command = msg.content.substring(1, endIndex);

    if (msg.deletable) {
      await msg.delete();
    }
    
    try {
      if (command in AdminActions) {
        await AdminActions[command](msg);
      }
      else {
        throw new InvalidCommandError(command);
      }
    } catch(err) {
      msg.author.send(err.message);
      console.error((err as Error).stack);
    }

  } else if (msg.channel instanceof TextChannel) {
    await Message.createFromMsg(msg);
  }
});

client.on("guildMemberUpdate", 
  async (oldMember: GuildMember, newMember: GuildMember) => {

  if (oldMember.roles === newMember.roles) {
    return;
  }

  let roomIds: string[] = [];
  let roleNames: string[] = [];

  newMember.roles.forEach((r: Role) => {
    if (!(r.name in manager.rooms)) {
      return;
    } 

    if (!oldMember.roles.has(r.id) && r.name in manager.rooms) {
      let channel = manager.rooms[r.name].channel;
      if (channel) {
        roomIds.push(channel.id);
        roleNames.push(r.name);
      }
    }
  });

  let user = await User.findOne({
    where: {
      id: newMember.id
    }
  });

  if (user) {
    user.addVisitedRooms(roomIds);
    for (let role of roleNames) {
      let room = manager.rooms[role];
      if (room) {
        room.visitors.add(newMember.id);
      }
    }
  }

}); 

initDB().then(async () => {
  try {
    await sequelize.sync();
    await client.login(config.botToken);
  } catch(err) {
    console.error((err as Error).stack);
  }
});

export function m() {
  return manager;
}