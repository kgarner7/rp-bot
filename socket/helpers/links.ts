import { GuildMember } from "discord.js";
import { Op } from "sequelize";

import { idIsAdmin } from "../../helpers/base";
import { globalLock } from "../../helpers/locks";
import { Link, sequelize, Room, User } from "../../models/models";

export interface MinimalRoomWithLink {
  i: string;
  l: MinimalLink[];
  n: string;
}

export interface MinimalLink {
  h?: boolean;
  i: string;
  l?: boolean;
  n: string;
  t: string;
}

export async function createMap(user: GuildMember | User): Promise<MinimalRoomWithLink[]> {
  let rooms: Room[];

  if (idIsAdmin(user.id)) {
    rooms = await Room.findAll({
      include: [{
        as: "sources",
        include: [{
          as: "target",
          model: Room
        }],
        model: Link,
        required: false
      }]
    });


  } else {
    const userModel = await User.findOne({
      include: [{
        as: "visitedRooms",
        include: [{
          as: "sources",
          include: [{
            as: "target",
            model: Room
          }],
          model: Link,
          where: {
            hidden: false
          },
          required: false
        }],
        model: Room
      }],
      where: {
        id: user.id
      }
    });

    rooms = userModel?.visitedRooms || [];

    if (userModel && rooms) {
      const linkIds = new Set((await userModel.getVisitedLinks()).map(link => link.id));

      for (const room of rooms) {
        for (const link of room.sources) {
          if (!linkIds.has(link.id)) {
            link.target.name = `${ link.name}??`;
          }
        }
      }
    }
  }

  return rooms.map(room => {
    const links = room.sources.map(source => {
      const link: MinimalLink = {
        i: source.target.id,
        n: source.name,
        t: source.target.name
      };

      if (source.hidden) link.h = true;
      if (source.locked) link.l = true;

      return link;
    });

    return {
      i: room.id,
      l: links,
      n: room.name
    };
  });
}

export interface NewLink {
  h?: boolean;
  i?: string;
  l?: boolean;
  n: string;
  t?: string;
}

export interface LinkCreation {
  b: boolean;
  f: string;
  i?: NewLink;
  o: NewLink;
  t: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isNewLink(value: any): value is NewLink {
  return (value && typeof value === "object")
  && (value.n && typeof value.n === "string")
  && (value.h !== undefined ? typeof value.h === "boolean" : true)
  && (value.l !== undefined ? typeof value.l === "boolean" : true);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLinkCreation(value: any): value is LinkCreation {
  const baseCheck =  (value.b !== undefined ? typeof value.b === "boolean" : true)
    && (value.f && typeof value.f === "string")
    && isNewLink(value.o)
    && (value.t && typeof value.t === "string");

  if (!baseCheck) {
    return false;
  }

  if (value.i) {
    return isNewLink(value.i);
  } else {
    return true;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleLinkCreation(args: any): Promise<LinkCreation | string> {
  if (!isLinkCreation(args)) {
    return "Invalid data for link creation";
  }

  await globalLock({ acquire: true, writer: true });

  let oldLink: NewLink;
  let newLink: NewLink | undefined;

  try {
    let existingLinks: Link[];

    if (args.b) {
      existingLinks = await Link.findAll({
        where: {
          [Op.or]: [{
            sourceId: args.f,
            targetId: args.t
          }, {
            sourceId: args.t,
            targetId: args.f
          }]
        }
      });
    } else {
      existingLinks = await Link.findAll({
        where: {
          [Op.or]: [{
            sourceId: args.f,
            targetId: args.t
          }]
        }
      });
    }

    if (existingLinks.length > 0) {
      return "There are existing links between the rooms. Please refresh to get the recent state";
    }

    const rooms = await Room.findAll({
      where: {
        id: {
          [Op.or]: [args.f, args.t]
        }
      }
    });

    if (rooms.length < 2) {
      return "Could not find both source and destination room";
    }

    let source: Room = rooms[0];
    let target: Room = rooms[1];

    for (const room of rooms) {
      if (room.id === args.f) {
        source = room;
      } else {
        target = room;
      }
    }

    const transaction = await sequelize.transaction();

    try {
      await Link.create({
        hidden: args.o.h || false,
        locked: args.o.l || false,
        name: args.o.n,
        sourceId: args.f,
        targetId: args.t
      }, {
        transaction
      });

      oldLink = {
        i: args.t,
        t: target.name,
        ...args.o
      };

      if (args.i) {
        await Link.create({
          hidden: args.i.h || false,
          locked: args.i.l || false,
          name: args.i.n,
          sourceId: args.t,
          targetId: args.f
        }, {
          transaction
        });

        newLink = {
          i: args.f,
          t: source.name,
          ...args.i
        };
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } finally {
    await globalLock({ acquire: false, writer: true });
  }

  return {
    b: args.b,
    f: args.f,
    i: newLink,
    o: oldLink,
    t: args.t
  };
}

export interface LinkDeletion {
  h: boolean;
  l: boolean;
  n: string;
  s: string;
  t: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLinkDeletion(args: any): args is LinkDeletion {
  return (args.h !== undefined ? typeof args.h === "boolean" : true)
    && (args.l !== undefined ? typeof args.l === "boolean" : true)
    && (args.n && typeof args.n === "string")
    && (args.s && typeof args.s === "string")
    && (args.t && typeof args.t === "string");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleLinkDeletion(args: any): Promise<LinkDeletion | string> {
  if (!isLinkDeletion(args)) {
    return "Not valid data";
  }

  await globalLock({ acquire: true, writer: true });

  try {
    const link = await Link.findOne({
      where: {
        hidden: args.h,
        locked: args.l,
        name: args.n,
        sourceId: args.s,
        targetId: args.t
      }
    });

    if (!link) {
      return "Could not find a link matching those descriptions";
    }

    await link.destroy();
  } finally {
    await globalLock({ acquire: false, writer: true });
  }

  return args;
}

export interface MinimalLinkInfo {
  h?: boolean;
  l?: boolean;
  n: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isMinimalLinkInfo(args: any): args is MinimalLinkInfo {
  return (args.h !== undefined ? typeof args.h === "boolean" : true)
    && (args.l !== undefined ? typeof args.l === "boolean": true)
    && (args.n && typeof args.n === "string");
}

export interface LinkChange {
  f: string;
  n: MinimalLinkInfo;
  o?: MinimalLinkInfo;
  t: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLinkChange(args: any): args is LinkChange {
  return (args.f && typeof args.f === "string")
    && (args.n && isMinimalLinkInfo(args.n))
    && (args.o !== undefined ? isMinimalLinkInfo(args.o) : true)
    && (args.t && typeof args.t === "string");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleLinkChange(args: any): Promise<LinkChange | string> {
  if (!isLinkChange(args)) {
    return "Invalid data format";
  } else if (args.o === undefined) {
    return "Must provide old state for verification";
  }

  await globalLock({ acquire: true, writer: true });

  try {
    const link = await Link.findOne({
      where: {
        sourceId: args.f,
        targetId: args.t
      }
    });

    if (!link) {
      return "Could not find a link between those two rooms";
    }

    const oldStateMatches = ((args.o.h || false) === link.hidden)
      && ((args.o.l || false) === link.locked)
      && (args.o.n === link.name);

    if (!oldStateMatches) {
      return "Old state is not consistent. Please refresh for newest changes";
    }

    await link.update({
      hidden: args.n.h || false,
      locked: args.n.l || false,
      name: args.n.n
    });
  } finally {
    await globalLock({ acquire: false, writer: true });
  }

  return {
    f: args.f,
    n: args.n,
    t: args.t
  };
}
