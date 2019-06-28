import {
  BelongsTo,
  BelongsToCreateAssociationMixin,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  INTEGER,
  Model,
  STRING,
  TEXT,
  TINYINT,
  NUMBER
} from "sequelize";

import { sequelize } from "./connection";

export enum RequestStatus {
  PENDING = 0,
  ACCEPTED = 1,
  DENIED = 2
}

export class Request extends Model {
  public static associations: {
    user: BelongsTo;
  };

  public id: number;
  public name: string;
  public description: string;
  public quantity: number;
  public reason: string;
  public status: number;
  public createdAt?: Date;
  public updatedAt?: Date;

  public User: User;
  public UserId: string;
  public createUser: BelongsToCreateAssociationMixin<User>;
  public getUser: BelongsToGetAssociationMixin<User>;
  public setUser: BelongsToSetAssociationMixin<User, string>;

  public getStatus(): "pending" | "accepted" | "denied" {
    switch (this.status) {
      case RequestStatus.ACCEPTED: return "accepted";
      case RequestStatus.DENIED: return "denied";
      default: return "pending";
    }
  }
}

Request.init({
  description: {
    allowNull: false,
    type: TEXT
  },
  id: {
    autoIncrement: true,
    primaryKey: true,
    type: INTEGER
  },
  name: {
    allowNull: false,
    type: STRING
  },
  quantity: {
    defaultValue: 1,
    type: INTEGER
  },
  reason: {
    type: TEXT
  },
  status: {
    defaultValue: 0,
    type: INTEGER,
    validate: {
      max: 2,
      min: 0
    }
  }
}, { sequelize });

// tslint:disable-next-line:ordered-imports
import { User } from "./user";

Request.belongsTo(User);
