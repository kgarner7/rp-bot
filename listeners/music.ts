import { queue } from "async";
import { Guild, StreamDispatcher, VoiceChannel } from "discord.js";
import { promises } from "fs";
import ytdl from "ytdl-core";

import { mainGuild, requireAdmin } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";
import { isNone, None } from "../helpers/types";

import { Action } from "./actions";
import { parseCommand, sendMessage } from "./baseHelpers";

export const usage: Action = {
  play: {
    description: "Play music (optionally in a set of rooms)",
    uses: [
      {
        admin: true,
        explanation: "Plays the song, song.mp3 in the general voice chat",
        use: "!play **song path** in **voice chat list** **loop?**"
      },
      {
        admin: true,
        explanation: "Plays a youtube video",
        use: "!play **url** tube"
      }
    ]
  },
  stop: {
    description: "Stops all music being played",
    uses: [
      {
        admin: true,
        use: "!stop"
      }
    ]
  }
};

const activeChannels = new Map<string, StreamDispatcher>();
const tempChannels = new Map<string, StreamDispatcher>();

const musicQueue = queue(
  ({ shouldPlay, channels = [], path = "", tube = "", loop = false }:
  { shouldPlay: boolean; channels?: string[]; loop?: boolean; path?: string;
    tube?: string; },
   callback: (err?: None<Error>) => void) => {

  const guild = mainGuild();

  if (shouldPlay) {
    startChannels(channels, guild, loop, path, tube)
      .then(() => {
        callback(undefined);
      })
      .catch(err => {
        activeChannels.clear();
        callback(err);
      });
  } else {
    stopDispatches(guild);
    callback();
  }
}, 1);

function stopDispatches(guild: Guild): void {
  for (const [channel, dispatch] of activeChannels) {
    const voiceChannel = guild.channels.get(channel);

    if (voiceChannel instanceof VoiceChannel) voiceChannel.leave();

    dispatch.end("stop called");
  }

  activeChannels.clear();
}

async function startChannels(channels: string[], guild: Guild, loop: boolean,
                             path: string, tube: string): Promise<void> {
  for (const channelName of channels) {
    const channel = guild.channels.find(c =>
        c.type === "voice" && c.name === channelName) as None<VoiceChannel>;

    if (isNone(channel)) {
      throw new Error(`Could not find channel ${channelName}`);
    } else {
      const existing = activeChannels.get(channel.id);

      if (!isNone(existing)) {
        existing.end("early stop");
        activeChannels.delete(channel.id);
      }

      try {
        const connection = channel.connection || await channel.join();
        const dispatch = isNone(tube) ? connection.playFile(path) :
          connection.playStream(ytdl(path, { filter: "audioonly" }));

        tempChannels.set(channel.id, dispatch);

        dispatch.on("end", reason => {
          if (loop && isNone(reason)) {
            connection.playFile(path);
          } else {
            channel.leave();
          }
        });
      } catch (err) {
        tempChannels.clear();
        throw err;
      }
    }
  }
}

export async function play(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);
  const command = parseCommand(msg, ["in", "loop", "tube"]),
    path = command.params.join(""),
    loop = command.args.has("loop");

  if (!command.args.has("tube")) await promises.access(path);

  const channels = command.args.get("in") || ["general"];

  return new Promise((resolve: () => void, reject: (err: Error) => void): void => {
    musicQueue.push({ shouldPlay: true, channels, path, loop},
      (err: None<Error>): void => {

        if (!isNone(err)) {
          tempChannels.clear();
          console.error(err);
          sendMessage(msg, err.message, true);
          reject(err);

          return;
        }

        for (const [channel, dispatch] of tempChannels) {
          activeChannels.set(channel, dispatch);
        }

        tempChannels.clear();
        const message = `Now playing ${path} in ${channels}`;
        sendMessage(msg, message, true);
        resolve();
    });
  });
}

export async function stop(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);

  return new Promise((resolve: () => void): void => {
    musicQueue.push({ shouldPlay: false }, (err: None<Error>): void => {
      if (!isNone(err)) {
        console.error(err);
        sendMessage(msg, err.message, true);

        throw err;
      }

      sendMessage(msg, "Stoped playing music", true);
      resolve();
    });
  });
}
