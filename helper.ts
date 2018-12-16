import * as Discord from 'discord.js';

let guild: Discord.Guild;

export function init(externalGuild: Discord.Guild) {
  guild = externalGuild;
}

export function getMembers(msg: Discord.Message): Array<String> {
  let users: Array<String> = [];

  guild.members.forEach((member: Discord.GuildMember) => {
    if (member.user.bot !== true) {
      users.push(member.id);
    }
  });

  return users;
}