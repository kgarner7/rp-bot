process.env.NODE_ENV = "recovery";

let previousTime = new Date();

import {
  ChannelLogsQueryOptions,
  Client,
  Collection,
  Guild,
  GuildAuditLogsEntry,
  GuildAuditLogsFetchOptions,
  Message as DiscordMessage,
  TextChannel,
  User as DiscordUser
} from "discord.js";
import { Op } from "sequelize";

import { config } from "./config/config";
import { initGuild, initUsers } from "./helpers/base";
import { SortableArray } from "./helpers/classes";
import { Undefined } from "./helpers/types";
import {
  Link,
  Message,
  Room,
  sequelize
} from "./models/models";
import { RoomManager } from "./rooms/roomManager";

class Change {
  public add?: string;
  public remove?: string;

  public constructor(add?: string, remove?: string) {
    this.add = add;
    this.remove = remove;
  }

  public toString(): string {
    return (this.add ? `addition: ${this.add} ` : " ") +
      (this.remove ? `removal: ${this.remove}` : "");
  }
}
type UserEntry = [Date, Change];

const client = new Client();
let guild: Guild;

const cachedRoomsById = new Collection<string, Room>();
const cachedRoomsByName = new Collection<string, Room>();
const usersRoles = new Map<string, SortableArray<UserEntry>>();
const visitations = new Map<string, Map<string, Set<string>>>();

client.login(config.botToken);

let actionCount = 1;

function log(msg: string): void {
  const now = new Date();
  const elapsedTime = now.valueOf() - previousTime.valueOf();
  const entry = `${actionCount}): ${msg}. Elapsed: ${elapsedTime}\n`;

  process.stdout.write(entry);
  actionCount++;
  previousTime = new Date();
}

log("starting recovery");

client.on("ready", async () => {
  log("ready");

  await sequelize.sync({ force: true });
  guild = client.guilds.find((g: Guild) => g.name === config.guildName);
  initGuild(guild);

  await RoomManager.create("./data/rooms");
  await initUsers("./data/users");

  log("recovered rooms and users");

  const rooms = await Room.findAll();

  for (const room of rooms) {
    cachedRoomsById.set(room.id, room);
    cachedRoomsByName.set(room.name, room);
  }

  for (const [, member] of guild.members) {
    usersRoles.set(member.user.id, new SortableArray());
  }

  const logs = (await fetchAuditLogs());

  log("recovered logs");

  parseAuditLogs(logs);
  await restoreVisitors();

  log("restored visitations");

  for (const room of cachedRoomsByName.values()) {
    const channel = guild.channels.get(room.id) as TextChannel;
    await fetchMessages(channel);
  }

  log("restored messages");

  process.exit(0);
});

function parseAuditLogs(logs: AuditLog): void {
  for (const [, entry] of logs) {
    if (entry.target instanceof DiscordUser) {
      if (entry.target.bot || entry.target.username === "testing-account") continue;

      const user = entry.target as DiscordUser;
      const addition = entry.changes.find(c => c.key === "$add");
      const removal = entry.changes.find(c => c.key === "$remove");
      const changes = new Change();

      if (addition) {
        const newRole = addition.new[0].name;
        changes.add = newRole;

        if (removal) {
          const oldRole = removal.new[0].name;
          changes.remove = oldRole;

          let sourceMap = visitations.get(oldRole);

          if (!sourceMap) {
            sourceMap = new Map();
            visitations.set(oldRole, sourceMap);
          }

          let targetSet = sourceMap.get(newRole);

          if (!targetSet) {
            targetSet = new Set();
            sourceMap.set(newRole, targetSet);
          }

          targetSet.add(user.id);
        }
      }

      usersRoles.get(user.id)!.add([
        entry.createdAt,
        changes
      ]);
    }
  }
}

async function restoreVisitors(): Promise<void> {
  const transaction = await sequelize.transaction();

  try {
    for (const [source, sourceMap] of visitations) {
      for (const [target, targetSet] of sourceMap) {
        const sourceId = cachedRoomsByName.get(source)!.id,
          targetId = cachedRoomsByName.get(target)!.id;

        const links = await Link.findAll({
          transaction,
          where: {
            [Op.or]: [
              {
                sourceId,
                targetId
              }, {
                sourceId: targetId,
                targetId: sourceId
              }
            ]
          }
        });

        for (const link of links) {
          await link.setVisitors(Array.from(targetSet), { transaction });
        }
      }
    }
    await transaction.commit();
  } catch (err) {
    console.error(err);
    await transaction.rollback();
  }
}

type AuditLog = Collection<string, GuildAuditLogsEntry>;

let logCount = 0;
const LOGS_PER_FETCH = 10;

async function fetchAuditLogs(before?: AuditLog): Promise<AuditLog> {
  const options: GuildAuditLogsFetchOptions = {
    limit: LOGS_PER_FETCH,
    type: "MEMBER_ROLE_UPDATE"
  };

  if (before) {
    options.before = before.last();
  } else {
    // tslint:disable-next-line:no-parameter-reassignment
    before = new Collection();
  }

  process.stdout.write(`\rfetching logs ${logCount + 1} - ${logCount + LOGS_PER_FETCH}`);

  const nextLogs = await guild.fetchAuditLogs(options);
  logCount += LOGS_PER_FETCH;

  if (nextLogs.entries.size === 0) {
    process.stdout.write("\n");
    return before;
  } else {
    return fetchAuditLogs(before.concat(nextLogs.entries));
  }
}

async function fetchMessages(channel: TextChannel): Promise<void> {
  let messageCount = 0;

  let before: Undefined<DiscordMessage>;
  const options: ChannelLogsQueryOptions = {
    limit: LOGS_PER_FETCH
  },
    transaction = await sequelize.transaction();

  try {
    while (true) {
      if (before) options.before = before.id;

      process.stdout.write(`\rfetching messages for ${channel.name} ${messageCount + 1} - ${messageCount + LOGS_PER_FETCH}`);

      const messages = await channel.fetchMessages(options);

      messageCount += LOGS_PER_FETCH;

      if (messages.size === 0) break;

      for (const [, message] of messages) {
        await Message.upsert({
          createdAt: message.createdAt,
          id: message.id,
          message: message.content,
          RoomId: message.channel.id,
          SenderId: message.author.id
        }, { transaction });
      }

      before = messages.last();
    }

    console.log();
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
  }
}

function getPresentMembers(message: DiscordMessage): string[] {
  const channel = (message.channel as TextChannel),
    users: string[] = [];

  for (const [userId, roleLog] of usersRoles) {
    // const currentRole = roleLog.closest([message.createdAt, ""])[0][1];

    // if (currentRole === channel.id) {
    //   users.push(userId);
    // }
  }

  return users;
}

