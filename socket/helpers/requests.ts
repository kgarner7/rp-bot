import { Transaction } from "sequelize";

import { guild } from "../../client";
import { idIsAdmin, sentToAdmins } from "../../helpers/base";
import { lock, unlock } from "../../helpers/locks";
import { ignorePromise } from "../../listeners/baseHelpers";
import { Request, User, sequelize } from "../../models/models";
import { RequestStatus } from "../../models/request";

export interface MinimalRequest {
  c: Date;
  d: string;
  i: number;
  n: string;
  q: number;
  r?: string;
  s: RequestStatus;
  u?: string;
}

export async function getRequests(id: string): Promise<MinimalRequest[]> {
  const isAdmin = idIsAdmin(id);
  let requests: Request[];

  if (isAdmin) {
    requests = await Request.findAll({
      include: [{
        model: User
      }]
    });
  } else {
    requests = await Request.findAll({
      where: {
        UserId: id
      }
    });
  }

  return requests.map(request => {
    const base: MinimalRequest = {
      c: request.createdAt!,
      d: request.description,
      i: request.id,
      n: request.name,
      q: request.quantity,
      s: request.status
    };

    if (request.status === RequestStatus.DENIED) {
      base.r = request.reason;
    }

    if (isAdmin) {
      base.u = request.User.name;
    }

    return base;
  });
}

export interface RequestChange {
  a: boolean;
  i: number;
  r?: string;
}

function isRequestChange(data: any): data is RequestChange {
  return (typeof data.a === "boolean")
    && (data.i && typeof data.i === "number")
    && (data.r !== undefined ? typeof data.r === "string" : true);
}

function notifyUser(id: string, message: string): void {
  const user = guild.members.resolve(id);

  if (user) {
    ignorePromise(user.send(message));
  }
}

export async function handleRequestChange(data: any): Promise<RequestChange | string> {
  if (!isRequestChange(data)) {
    return "Not a valid request";
  }

  let transaction: Transaction;

  try {
    transaction = await sequelize.transaction();

    const request = await Request.findOne({
      where: {
        id: data.i
      },
      lock: true,
      transaction
    });

    if (!request) {
      throw new Error(`Could not find a request ${data.i}`);
    } else if (request.status !== RequestStatus.PENDING) {
      throw new Error(`Request ${data.i} is not pending`);
    }

    if (!data.a) {
      await request.update({
        reason: data.r,
        status: RequestStatus.DENIED
      }, { transaction });

      notifyUser(request.UserId, `Request ${data.i} was rejected: ${data.r}`);
    } else {
      const redlock = await lock({user: request.UserId });

      try {
        const user = await User.findOne({
          where: {
            id: request.UserId
          },
          transaction
        });

        if (!user) {
          throw new Error(`No user ${request.UserId}`);
        }

        const name = request.name;
        let message: string;

        if (name in user.inventory) {
          user.inventory[name].quantity = (user.inventory[name].quantity || 1) + request.quantity;
          user.inventory[name].description = request.description;

          message = `You already have ${name}. Its quantity and description were updated`;
        } else {
          user.inventory[name] = {
            description: request.description,
            editable: true,
            hidden: false,
            locked: false,
            name,
            quantity: request.quantity
          };

          message = `Created ${request.quantity} of new item ${name}: ${request.description}`;
        }

        await request.update({ status: RequestStatus.ACCEPTED }, { transaction });
        await user.update({ inventory: user.inventory }, { transaction });

        notifyUser(user.id, message);
      } finally {
        await unlock(redlock);
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction!.rollback();

    return (error as Error).message;
  }

  return data;
}

export interface RequestCreation {
  c?: Date;
  d: string;
  i?: number;
  q: number;
  n: string;
  u?: string;
}

function isRequestCreation(data: any): data is RequestCreation {
  return (data.d && typeof data.d === "string")
    && (data.q && typeof data.q === "number")
    && (data.n && typeof data.n === "string");
}

export async function handleRequestCreation(data: any, user: User):
Promise<RequestCreation | string> {
  if (!isRequestCreation(data)) {
    return "Not valid request creation";
  }

  const request = await Request.create({
    description: data.d,
    name: data.n,
    quantity: data.q,
    UserId: user.id
  });

  const msg = `New request from ${user.discordName} (#${request.id}): ${data.q} of ${data.n}`;

  ignorePromise(sentToAdmins(guild, msg));

  return {
    ...data,
    c: request.createdAt!,
    i: request.id,
    u: user.name
  };
}
