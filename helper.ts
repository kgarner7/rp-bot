import * as Discord from 'discord.js';
import { AccessError } from './config/errors';

let guild: Discord.Guild;
let everyone: Discord.Role;

/**
 * Initializes the local server to be passed between modules
 * @param externalGuild the global server for this bot
 */
export function init(externalGuild: Discord.Guild) {
  guild = externalGuild;
}

/**
 * Returns the shared guild. 
 * Should only be called after initialization
 * @returns {Discord.Guild} the shared guild instance
 */
export function mainGuild(): Discord.Guild {
  return guild;
}

export function everyoneRole() {
  if (everyone !== undefined) {
    return everyone;
  } else {
    everyone = guild.roles.find(r => r.name === "@everyone");
    return everyone;
  }
}

/**
 * Gets the IDs of all members currently present in a channel
 * @param {Discord.Message} msg the message to be parsed
 * @returns {string[]} an array of the member of IDS when a message is sent
 */
export function getMembers(msg: Discord.Message): string[] {
  let users: string[] = [];
  
  if (msg.channel instanceof Discord.TextChannel) {
    msg.channel.members.forEach((member: Discord.GuildMember) => {
      if (member.user.bot !== true) {
        users.push(member.id);
      }
    });
  }

  return users;
}

/**
 * Throws an AccessError if the user is not an admin
 * @param msg the message we are handling
 * @throws {AccessError}
 */
export function requireAdmin(msg: Discord.Message) {
  if (msg.author.id !== mainGuild().ownerID) {
    throw new AccessError(msg.content);
  }
}