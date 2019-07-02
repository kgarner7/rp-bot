import {
  ChannelLogsQueryOptions,
  Client,
  Collection,
  Guild,
  GuildAuditLogsEntry,
  GuildAuditLogsFetchOptions,
  Message,
  TextChannel,
  User
} from "discord.js";

import { config } from "./config/config";

export const client = new Client();
export let guild: Guild;
export let logs: AuditLog;
export const messagesMap = new Map<string, Messages>();

type UserEntry = [Date, string];

const usersRoles = new Map<string, UserEntry[]>();

client.on("ready", async () => {
  console.log("ready");
  guild = client.guilds.find((g: Guild) => g.name === config.guildName);

  for (const [, member] of guild.members) {
    usersRoles.set(member.user.username, []);
  }

  logs = (await fetchAuditLogs())
    .filter(audit => audit.action === "MEMBER_ROLE_UPDATE")
    .sort();

  console.log("got logs");

  for (const [, entry] of logs) {
    if (entry.target instanceof User) {
      if (entry.target.bot || entry.target.username === "testing-account") continue;

      const user = entry.target as User;
      const change = entry.changes.find(c => c.key === "$add");

      if (change) {
        const newRole = change.new[0].name;

        if (newRole !== "blue floor resident") {
          usersRoles.get(user.username)!.push([entry.createdAt, newRole]);
        }
      }
    }
  }

  console.log(usersRoles);
});

export type AuditLog = Collection<string, GuildAuditLogsEntry>;
export type Messages = Collection<string, Message>;

export async function fetchAuditLogs(before?: AuditLog): Promise<AuditLog> {
  const options: GuildAuditLogsFetchOptions = { };

  if (before) {
    options.before = before.last();
  } else {
    before = new Collection();
  }

  const nextLogs = await guild.fetchAuditLogs(options);

  if (nextLogs.entries.size === 0) {
    return before;
  } else {
    return fetchAuditLogs(before.concat(nextLogs.entries));
  }
}

export async function fetchMessages(channel: TextChannel, messages?: 
                                    Messages): Promise<Messages> {
  const options: ChannelLogsQueryOptions = { };

  if (messages) {
    options.before = messages.last().id;
  } else {
    messages = new Collection();
  }

  const nextMessages = await channel.fetchMessages(options);

  if (nextMessages.size === 0) {
    return messages;
  } else {
    return fetchMessages(channel, messages.concat(nextMessages));
  }
}


client.login(config.botToken);
