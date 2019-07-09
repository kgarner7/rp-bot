import { queue } from "async";
import { Guild, StreamDispatcher, VoiceChannel } from "discord.js";
import { promises } from "fs";
import ytdl from "ytdl-core";

import { guild } from "../client";
import { requireAdmin } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";
import { isNone, None, Undefined } from "../helpers/types";

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

let activeChannel: Undefined<VoiceChannel>;
let activeDispatch: Undefined<StreamDispatcher>;

const musicQueue = queue(
  ({ shouldPlay, channel = "", path = "", tube = "", loop = false }:
  { shouldPlay: boolean; channel?: string; loop?: boolean; path?: string;
    tube?: string; },
   callback: (err?: None<Error>) => void) => {

  if (shouldPlay) {
    startChannel(channel, loop, path, tube)
      .then(() => {
        callback(undefined);
      })
      .catch(err => {
        callback(err);
      });
  } else {
    if (activeDispatch) {
      activeDispatch.end("stop");
      activeDispatch = undefined;
    }

    if (activeChannel) {
      activeChannel.leave();
      activeChannel = undefined;
    }
    callback();
  }
}, 1);

async function startChannel(channelName: string, loop: boolean,
                            path: string, tube: string): Promise<void> {
  const channel = guild.channels.find(c =>
      c.type === "voice" && c.name === channelName) as None<VoiceChannel>;

  if (isNone(channel)) {
    throw new Error(`Could not find channel ${channelName}`);
  } else {
    try {
      const connection = channel.connection || await channel.join();
      activeChannel = channel;

      activeDispatch = isNone(tube) ? connection.playFile(path) :
        connection.playStream(ytdl(path, { filter: "audioonly" }));

      activeDispatch.on("end", reason => {
        if (loop && isNone(reason)) {
          connection.playFile(path);
        } else {
          channel.leave();
        }
      });
    } catch (err) {
      if (activeChannel) {
        activeChannel.leave();
        activeChannel = undefined;
      }

      if (activeDispatch) {
        activeDispatch.end("error");
        activeDispatch = undefined;
      }

      throw err;
    }
  }
}

export async function play(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);
  const command = parseCommand(msg, ["in", "loop", "tube"]),
    path = command.params.join(""),
    loop = command.args.has("loop");

  if (!command.args.has("tube")) await promises.access(path);

  const channel = (command.args.get("in") || ["general"]).join();

  return new Promise((resolve: () => void, reject: (err: Error) => void): void => {
    musicQueue.push({ shouldPlay: true, channel, path, loop},
      (err: None<Error>): void => {

        if (!isNone(err)) {
          console.error(err);
          sendMessage(msg, err.message, true);
          reject(err);

          return;
        }

        const message = `Now playing ${path} in ${channel}`;
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
