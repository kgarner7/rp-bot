import { randomBytes } from "crypto";

import { client } from "../client";
import { CustomMessage } from "../helpers/classes";

import { Action } from "./actions";
import { sendMessage } from "./baseHelpers";


const DICE_IDS = [
  "721926836954595392", "721926776258822184", "721926707090685993",
  "721926627767877753", "721926434205204500", "721925901981450292"
];

export const usage: Action = {
  roll: {
    description: "Roll a d6",
    uses: [{ use: "!roll" }]
  }
};

export async function roll(msg: CustomMessage): Promise<void> {
  const result = randRoll();

  sendMessage(msg, `${client.emojis.cache.get(DICE_IDS[result])}`);
}

function randRoll(): number {
  let size: number;

  do {
    // eslint-disable-next-line no-bitwise, @typescript-eslint/no-magic-numbers
    size = randomBytes(1).readUInt8(0) & 0x0F;
  } while (size >= DICE_IDS.length);

  return size;
}

