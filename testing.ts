import * as Discord from 'discord.js';
import { init } from './helper';
import { config } from './config/config';
import { RoomManager } from './rooms/roomManager';

const client = new Discord.Client();
let guild: Discord.Guild;

client.on("ready", () => {
  guild = client.guilds.find((g: Discord.Guild) => g.name === config.guildName);
  init(guild);
  RoomManager.create(__dirname + "./rooms/custom", true);
});

client.login(config.botToken);

