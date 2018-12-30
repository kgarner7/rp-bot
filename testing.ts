import * as Discord from 'discord.js';
import { initGuild } from './helper';
import { config } from './config/config';
import { RoomManager } from './rooms/roomManager';
import { Room, RoomAttributes } from './rooms/room';
import { m } from './index';
// let manager = getManager();
// let id = "523661052916006923";
// manager.neighbors(id, "room a");
// 523661052916006923
// const client = new Discord.Client();
// let guild: Discord.Guild;

// client.on("ready", () => {
//   guild = client.guilds.find((g: Discord.Guild) => g.name === config.guildName);
//   initGuild(guild);
//   RoomManager.create(__dirname + "/rooms/custom", true);
// });

// client.login(config.botToken);

