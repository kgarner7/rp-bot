import { existsSync, readFileSync, unlinkSync } from "fs";
import { sync } from "glob";
import { writeFile } from "jsonfile";
import { basename } from "path";

import { initRooms, initUsers, requireAdmin, roomManager } from "../helpers/base";
import { CustomMessage } from "../helpers/classes";
import { isNone, isRoomAttribute, isUserResolvable, Undefined } from "../helpers/types";
import { User, UserResolvable } from "../models/user";
import { ItemAttributes } from "../rooms/item";
import { NeighborResolvable, RoomAttributes, RoomResolvable } from "../rooms/room";
import { RoomManager } from "../rooms/roomManager";

import { Action } from "./actions";
import { parseCommand, sendMessage } from "./baseHelpers";

export const usage: Action = {
  delete: {
    description: "Deletes one or more files",
    uses: [{
      admin: true,
      example: "!delete room a, lavioso",
      explanation: `Deletes the file room a, and lavioso.
      For multiple files, use commas. This will guess whether each file
      is a room or user (in that order)`,
      use: "!delete **room/user list, comma separated**"
    }, {
      admin: true,
      example: "!delete room a, room b type room",
      explanation: "Deletes the room room a and room b (can also specify user)",
      use: "!delete **room or user list** type **room | user**"
    }]
  },
  read: {
    description: "Reads a json file",
    uses: [{
      admin: true,
      explanation: "Lists JSON files for user or room type (assumes room if not given)",
      use: "!read"
    }, {
      admin: true,
      use: "!read type **room | user**"
    }, {
      admin: true,
      explanation: "Reads contents of given JSON files (type can be given or guessed)",
      use: "!read **room/user list** "
    }]
  },
  save: {
    description: "Save the current state of the server to room and user files",
    uses: [{
      admin: true,
      use: "!save"
    }]
  },
  update: {
    description: "Reads user and room files and updates discord server",
    uses: [{
      admin: true,
      use: "!update"
    }]
  },
  write: {
    description: "Writes a file to disk",
    uses: [{
      admin: true,
      explanation: "Writes a properly formed JSON user or room file to disc",
      use: "!write **valid user/room json**"
    }]
  }
};

const possibleTypes = ["room", "user"];

export async function deleteFile(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);
  const command = parseCommand(msg, ["type"]),
    type = (command.args.get("type") || []).join("");

  const types: string[] = Array(command.params.length)
    .fill(type);

  for (let idx = 0; idx < command.params.length; idx++) {
    const file = command.params[idx];
    let localType: Undefined<string> = types[idx];

    if (localType !== "room" && localType !== "user") {
      localType = undefined;

      for (const possibleType of possibleTypes) {
        const path = `./data/${possibleType}s/${file}.json`;

        if (existsSync(path)) {
          localType = possibleType;
          break;
        }
      }

      if (localType === undefined) {
        throw new Error(`Could not find room or user for ${file}`);
      }

      types[idx] = localType;
    } else {
      const path = `./data/${type}s/${file}.json`;
      if (!existsSync(path)) {
        throw new Error(`No ${type} file with name ${file}`);
      }
    }
  }

  for (let idx = 0; idx < command.params.length; idx++) {
    const file = command.params[idx],
      localType = types[idx],
      path = `./data/${localType}s/${file}.json`;

    unlinkSync(path);
  }

  const unlinked = command.params.join(", ");
  sendMessage(msg, `Successfully unlinked files ${unlinked}`, true);
}

export async function read(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);
  const command = parseCommand(msg, ["as", "type"]),
    format = (command.args.get("as") || []).join(""),
    type = (command.args.get("type") || []).join("");

  let dir: "rooms" | "users";

  if (type.length === 0 || type === "room") {
    dir = "rooms";
  } else if (type === "user") {
    dir = "users";
  } else {
    throw new Error("There is no file of that type");
  }

  const attachments = command.params
    .map(filename => {
      const path = `./data/${dir}/${filename}.json`;

      return {
        attachment: path,
        name: filename + ".json"
      };
    });

  if (attachments.length === 0) {
    const files = sync(`./data/${dir}/**/*.json`)
      // tslint:disable-next-line:no-unnecessary-callback-wrapper
      .map(file => basename(file));

    const message = files.length === 0 ?
         `There are no files in ./data/${dir}` : files.join(", ");

    sendMessage(msg, message,  true);
  } else {
    try {
      if (format === "text") {
        let message = "";
        for (const file of attachments) {
          message += readFileSync(file.attachment) + "\n";
        }

        await sendMessage(msg, message, true);
      } else {
        await msg.author.send({
          files: attachments
        });
      }
    } catch (err) {
      throw err;
    }
  }
}

export async function save(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);
  await handleSave();
  sendMessage(msg, "Saved successfully", true);
}

export async function handleSave(): Promise<void> {
  const manager = roomManager();

  for (const [, room] of manager.rooms) {
    const itemsList: ItemAttributes[] = [];

    for (const item of room.items.values()) {
      const itemData: ItemAttributes = {
        description: item.description,
        locked: item.locked,
        name: item.name,
        quantity: item.quantity
      };

      itemsList.push(itemData);
    }

    const neighborsList: NeighborResolvable[] = [];
    const links = manager.links.get(room.name);

    if (!isNone(links)) {
      for (const link of links.values()) {
        const neighborData: NeighborResolvable = {
          hidden: link.hidden,
          locked: link.locked,
          name: link.name,
          to: link.to
        };

        neighborsList.push(neighborData);
      }
    }

    const data: RoomResolvable = {
      color: room.color,
      description: room.description,
      isPrivate: room.isPrivate,
      isPublic: room.isPublic,
      itemsList,
      name: room.name,
      neighbors: neighborsList,
      parent: room.parent
    };

    writeFile(`./data/rooms/${room.parent}/${room.name}.json`, 
      data, { spaces: 2 }, err => {
      if (err) {
        console.error(err);
      }
    });
  }

  const users = await User.findAll();

  for (const user of users) {
    const inventory: ItemAttributes[] = [];

    for (const item of Object.values(user.inventory)) {
      const itemData: ItemAttributes = {
        description: item.description,
        locked: item.locked,
        name: item.name,
        quantity: item.quantity
      };

      inventory.push(itemData);
    }

    const userData: UserResolvable = {
      discordName: user.discordName,
      id: user.id,
      inventory,
      name: user.name
    };

    writeFile(`./data/users/${user.name}.json`, userData, { spaces: 2 }, err => {
      if (err) {
        console.error(err);
      }
    });
  }
}

export async function update(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);
  await handleUpdate();
  sendMessage(msg, "Updated successfully", true);
}

export async function handleUpdate(): Promise<void> {
  const manager = await RoomManager.create("./data/rooms");
  initRooms(manager);
  await initUsers("./data/users");
}

export async function write(msg: CustomMessage): Promise<void> {
  requireAdmin(msg);
  const command = parseCommand(msg);

  const json = JSON.parse(command.params.join(", "));
  let path = "./data/";

  if (isRoomAttribute(json)) {
    const room = json as RoomAttributes;
    path += `rooms/${room.parent}/${room.name}.json`;

  } else if (isUserResolvable(json)) {
    const user = json as UserResolvable;
    path += `rooms/${user.name}.json`;

  } else {
    throw new Error("Neither a user nor room resolvable");
  }

  try {
    await writeFile(path, json, { spaces: 2 });
    sendMessage(msg, `Updated file ${path} successfully`, true);
  } catch (err) {
    sendMessage(msg, `Could not update ${path}: ${err}`, true);
  }
}
