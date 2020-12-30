import { GuildChannel, TextChannel } from "discord.js";
import {
  HasMany,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  JSON,
  Model,
  STRING,
  TEXT,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyCreateAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BOOLEAN
} from "sequelize";

import { Dict } from "../helpers/base";
import { ItemModel } from "../helpers/types";

// eslint-disable-next-line import/order
import { sequelize } from "./connection";

/**
 * Database model corresponding to a Room
 * messages {Message[]}: list of all the messages sent in this room
 * sources {Link[]}: list of all the Links with this room as the origin
 * targets {Link[]}: list of all the Links with this room as the target
 */
export class Room extends Model {
  public static associations: {
    messages: HasMany;
    sources: HasMany;
    targets: HasMany;
  };

  /** the name of the corresponding Channel on Discord */
  public discordName: string;
  public history: boolean;
  /** the id of the corresponding Channel on Discord */
  public id: string;
  public inventory: Dict<ItemModel>;
  public isPrivate: boolean;
  public isPublic: boolean;
  /** the initial name of this Room */
  public name: string;
  public parent: string;
  public role: string;
  public createdAt: Date;
  public updatedAt: Date;

  public Messages: Message[];
  public addMessage: HasManyAddAssociationMixin<Message, string>;
  public addMessages: HasManyAddAssociationsMixin<Message, string>;
  public createMessage: HasManyCreateAssociationMixin<Message>;
  public getMessages: HasManyGetAssociationsMixin<Message>;
  public removeMessage: HasManyRemoveAssociationMixin<Message, string>;
  public removeMessages: HasManyRemoveAssociationsMixin<Message, string>;
  public setMessages: HasManySetAssociationsMixin<Message, string>;

  public sources: Link[];
  public addSource: HasManyAddAssociationMixin<Link, string>;
  public addSources: HasManyAddAssociationsMixin<Link, string>;
  public createSource: HasManyCreateAssociationMixin<Link>;
  public getSources: HasManyGetAssociationsMixin<Link>;
  public removeSource: HasManyRemoveAssociationMixin<Link, string>;
  public removeSources: HasManyRemoveAssociationsMixin<Link, string>;
  public setSources: HasManySetAssociationsMixin<Link, string>;

  public targets: Link[];
  public addTarget: HasManyAddAssociationMixin<Link, string>;
  public addTargets: HasManyAddAssociationsMixin<Link, string>;
  public createTarget: HasManyCreateAssociationMixin<Link>;
  public getTargets: HasManyGetAssociationsMixin<Link>;
  public removeTarget: HasManyRemoveAssociationMixin<Link, string>;
  public removeTargets: HasManyRemoveAssociationsMixin<Link, string>;
  public setTargets: HasManySetAssociationsMixin<Link, string>;

  public visitors: User[];
  public addVisitor: BelongsToManyAddAssociationMixin<User, string>;
  public addVisitors: BelongsToManyAddAssociationsMixin<User, string>;
  public countVisitors: BelongsToManyCountAssociationsMixin;
  public createVisitor: BelongsToManyCreateAssociationMixin<User>;
  public getVisitors: BelongsToManyGetAssociationsMixin<User>;
  public removeVisitor: BelongsToManyRemoveAssociationMixin<User, string>;
  public removeVisitors: BelongsToManyRemoveAssociationsMixin<User, string>;
  public setVisitors: BelongsToManySetAssociationsMixin<User, string>;

  /**
   * Creates a Room model from a Discord channel
   * @param channel the discord channel corresponding to this room
   */
  public static async createFromChannel(channel: GuildChannel): Promise<void> {
    if (channel instanceof TextChannel) {
      await Room.findOrCreate({
        defaults: { name: channel.name },
        where: { id: channel.id }
      });
    }
  }
}

Room.init({
  discordName: { type: TEXT },
  history: {
    defaultValue: false,
    type: BOOLEAN
  },
  id: {
    primaryKey: true,
    type: STRING
  },
  isPrivate: {
    defaultValue: false,
    type: BOOLEAN
  },
  isPublic: {
    defaultValue: false,
    type: BOOLEAN
  },
  inventory: {
    defaultValue: { },
    type: JSON
  },
  name: { type: TEXT },
  parent: {
    type: TEXT
  },
  role: {
    allowNull: false,
    type: STRING
  }
}, { sequelize });

// tslint:disable-next-line:ordered-imports
import { Link } from "./link";
import { Message } from "./message";
import { RoomVisitation } from "./roomVisitation";
import { User } from "./user";

Room.hasMany(Message, {
  onDelete: "CASCADE"
});

Room.hasMany(Link, {
  as: "sources",
  foreignKey: "sourceId"
});

Room.hasMany(Link, {
  as: "targets",
  foreignKey: "targetId"
});

Room.belongsToMany(User, {
  as: "visitors",
  onDelete: "CASCADE",
  through: RoomVisitation
});
