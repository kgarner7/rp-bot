import { lineEnd } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";

import { Action } from "./actions";
import { adjacentRooms, sendMessage } from "./baseHelpers";

export const usage: Action = {
  rooms: {
    description: "Lists all rooms that you have visited and can currently access",
    uses: [{
      use: "!rooms"
    }]
  }
};

/**
 * Gets all the rooms that the sender can currently visit
 * Implementation for the !rooms command.
 * @param msg the message being handled
 */
export async function getAvailableRooms(msg: CustomMessage): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
  const roomList: string[] = (await adjacentRooms(msg))
    .sort();

  let message: string;

  if (roomList.length > 0) {
    message = `Here are the rooms you can visit:${lineEnd}${roomList.join(lineEnd)}`;
  } else {
    message = "There are no rooms you can visit";
  }

  sendMessage(msg, message, true);
}
