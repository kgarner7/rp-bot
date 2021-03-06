import { GuildMember } from "discord.js";
import {
  BelongsToMany,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyCreateAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
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
  TEXT
} from "sequelize";

import { Dict } from "../helpers/base";
import { ItemModel, Null } from "../helpers/types";

// eslint-disable-next-line import/order
import { sequelize } from "./connection";

export interface UserResolvable {
  discordName: string;
  id: string;
  inventory: Dict<ItemModel>;
  name: string;
}

/**
 * Database model corresponding to a Discord user
 * messages {Message[]}: a list of all the messages the user was was presnet in
 * sentMessages {Message[]}: a list of all the messages sent by this user
 * visitedLinks {Link[]}: a list of all the links this user has visited
 */
export class User extends Model {
  public static associations: {
    messages: BelongsToMany;
    sentMessages: HasMany;
    visitedLinks: BelongsToMany;
  };

  /** the Discord id of the corresponding user */
  public discordName: string;
  public id: string;
  public inventory: Dict<ItemModel>;
  /** the display name of the corresponding Discord user */
  public name: string;
  public password: string;
  public createdAt?: Date;
  public updatedAt?: Date;

  public visitedLinks: Link[];
  public addVisitedLink: BelongsToManyAddAssociationMixin<Link, string>;
  public addVisitedLinks: BelongsToManyAddAssociationsMixin<Link, string>;
  public countVisitedLinks: BelongsToManyCountAssociationsMixin;
  public createVisitedLink: BelongsToManyCreateAssociationMixin<Link>;
  public getVisitedLinks: BelongsToManyGetAssociationsMixin<Link>;
  public removeVisitedLink: BelongsToManyRemoveAssociationMixin<Link, string>;
  public removeVisitedLinks: BelongsToManyRemoveAssociationsMixin<Link, string>;
  public setVisitedLinks: BelongsToManySetAssociationsMixin<Link, string>;

  public Messages: Message[];
  public addMessage: BelongsToManyAddAssociationMixin<Message, string>;
  public addMessages: BelongsToManyAddAssociationsMixin<Message, string>;
  public createMessage: BelongsToManyCreateAssociationMixin<Message>;
  public getMessages: BelongsToManyGetAssociationsMixin<Message>;
  public removeMessage: BelongsToManyRemoveAssociationMixin<Message, string>;
  public removeMessages: BelongsToManyRemoveAssociationsMixin<Message, string>;
  public setMessages: BelongsToManySetAssociationsMixin<Message, string>;

  public SentMessages: Message[];
  public addSentMessage: HasManyAddAssociationMixin<Message, string>;
  public addSentMessages: HasManyAddAssociationsMixin<Message, string>;
  public createSentMessage: HasManyCreateAssociationMixin<Message>;
  public getSentMessages: HasManyGetAssociationsMixin<Message>;
  public removeSentMessage: HasManyRemoveAssociationMixin<Message, string>;
  public removeSentMessages: HasManyRemoveAssociationsMixin<Message, string>;
  public setSentMessages: HasManySetAssociationsMixin<Message, string>;

  public Requests: Request[];
  public addRequest: BelongsToManyAddAssociationMixin<Request, number>;
  public addRequests: BelongsToManyAddAssociationsMixin<Request, number>;
  public createRequest: BelongsToManyCreateAssociationMixin<Request>;
  public getRequests: BelongsToManyGetAssociationsMixin<Request>;
  public removeRequest: BelongsToManyRemoveAssociationMixin<Request, number>;
  public removeRequests: BelongsToManyRemoveAssociationsMixin<Request, number>;
  public setRequests: BelongsToManySetAssociationsMixin<Request, number>;

  public visitedRooms: Room[];
  public addVisitedRoom: BelongsToManyAddAssociationMixin<Room, string>;
  public addVisitedRooms: BelongsToManyAddAssociationsMixin<Room, string>;
  public countVisitedRooms: BelongsToManyCountAssociationsMixin;
  public createVisitedRoom: BelongsToManyCreateAssociationMixin<Room>;
  public getVisitedRooms: BelongsToManyGetAssociationsMixin<Room>;
  public removeVisitedRoom: BelongsToManyRemoveAssociationMixin<Room, string>;
  public removeVisitedRooms: BelongsToManyRemoveAssociationsMixin<Room, string>;
  public setVisitedRooms: BelongsToManySetAssociationsMixin<Room, string>;

  /**
   * Creates a User model from a Discord GuildMember
   * @param member the guild member corresponding to this User
   */
  public static async createFromMember(member: GuildMember):
  Promise<Null<[User, boolean]>> {

    if (!member.user.bot) {
      const [user, created] = await User.findOrCreate({
        defaults: {
          discordName: member.displayName,
          name: member.user.username
        },
        where: { id: member.id }
      });

      if (user.discordName !== member.displayName) {
        await user.update({
          discordName: member.displayName
        });
      }

      return [user, created];
    } else {
      return null;
    }
  }
}

User.init({
  discordName: { type: STRING },
  id: {
    primaryKey: true,
    type: STRING
  },
  inventory: {
    defaultValue: { },
    type: JSON
  },
  name: {
    allowNull: false,
    type: TEXT
  },
  password: { type: TEXT }
}, {
  sequelize
});

import { Link } from "./link";
import { Message } from "./message";
import { Request } from "./request";
import { Room } from "./room";
import { RoomVisitation } from "./roomVisitation";

User.belongsToMany(Link, {
  as: "visitedLinks",
  through: "Visitation"
});

User.hasMany(Message, { as: "SentMessages" });

User.belongsToMany(Message, { through: "UserMessage" });

User.belongsToMany(Room, {
  as: "visitedRooms",
  through: RoomVisitation
});

User.hasMany(Request);
