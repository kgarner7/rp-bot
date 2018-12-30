import {
  Model,
  HasMany,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  STRING,
  TEXT,
  BelongsToMany,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCreateAssociationMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin
} from 'sequelize';
import sequelize from './connection';
import { GuildChannel, TextChannel } from 'discord.js';

/**
 * Database model corresponding to a Room
 * messages {Message[]}: list of all the messages sent in this room
 * sources {Link[]}: list of all the Links with this room as the origin
 * targets {Link[]}: list of all the Links with this room as the target
 * visitors: {User[]}: list of all the users that have visited this room
 */
export class Room extends Model {
  static associations: {
    messages: HasMany;
    sources: HasMany;
    targets: HasMany;
    visitors: BelongsToMany;
  }

  /** the name of the corresponding Channel on Discord */
  public discordName: string;
  /** the id of the corresponding Channel on Discord */
  public id: string;
  /** the initial name of this Room */
  public name: string;
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
   * @param {GuildChannel} channel the discord channel corresponding to this room
   */
  static async createFromChannel(channel: GuildChannel) {
    if (channel instanceof TextChannel) {
      await Room.findOrCreate({
        defaults: {
          name: channel.name
        },
        where: {
          id: channel.id
        }
      });
    }
  }
}

Room.init({
  discordName: {
    type: TEXT
  },
  id: {
    primaryKey: true,
    type: STRING
  },
  name: {
    type: TEXT
  }
}, { sequelize });

import { Message } from './message';
import { Link } from './link';
import { User } from './user';

Room.hasMany(Message);

Room.hasMany(Link, {
  as: "sources"
});

Room.hasMany(Link, {
  as: "targets"
});

Room.belongsToMany(User, {
  as: "visitors",
  through: "Visitation"
});