import { Message as DiscordMessage } from "discord.js";
import {
  BelongsTo,
  BelongsToCreateAssociationMixin,
  BelongsToGetAssociationMixin,
  BelongsToMany,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCreateAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BelongsToSetAssociationMixin,
  Model,
  STRING,
  TEXT
} from "sequelize";

import { getMembers } from "../helpers/base";

// eslint-disable-next-line import/order
import { sequelize } from "./connection";

/**
 * Database model representing a Discord message
 * room {Room}: the room in which this message was sent
 * sender {User}: the user who sent this message
 * users {User[]}: list of all the users currently in the room when this message was sent
 */

export class Message extends Model {
  public static associations: {
    room: BelongsTo;
    sender: BelongsTo;
    users: BelongsToMany;
  };

  /** the message id; corresponds to the ID on Discord */
  public id: string;
  /** the contents of the message */
  public message: string;
  public createdAt?: Date;
  public updatedAt?: Date;

  public Room: Room;
  public RoomId: string;
  public createRoom: BelongsToCreateAssociationMixin<Room>;
  public getRoom: BelongsToGetAssociationMixin<Room>;
  public setRoom: BelongsToSetAssociationMixin<Room, string>;

  public Sender: User;
  public SenderId: string;
  public createSender: BelongsToCreateAssociationMixin<User>;
  public getSender: BelongsToGetAssociationMixin<User>;
  public setSender: BelongsToSetAssociationMixin<User, string>;

  public Users: User[];
  public addUser: BelongsToManyAddAssociationMixin<User, string>;
  public addUsers: BelongsToManyAddAssociationsMixin<User, string>;
  public createUser: BelongsToManyCreateAssociationMixin<User>;
  public getUsers: BelongsToManyGetAssociationsMixin<User>;
  public removeUser: BelongsToManyRemoveAssociationMixin<User, string>;
  public removeUsers: BelongsToManyRemoveAssociationsMixin<User, string>;
  public setUsers: BelongsToManySetAssociationsMixin<User, string>;

  /**
   * Creates a Message record from a Discord Message
   * @param msg the discord message source
   */
  public static async createFromMsg(msg: DiscordMessage): Promise<void> {
    const transaction = await sequelize.transaction(),
      users = getMembers(msg);

    try {
      const message: Message = await Message.create({
        id: msg.id,
        message: msg.content,
        RoomId: msg.channel.id,
        SenderId: msg.author.id
      }, {
        transaction
      });

      await message.addUsers(users, { transaction });
      await transaction.commit();
    } catch (error) {
      console.error(error);
      await transaction.rollback();
    }
  }

  /**
   * Updates the Message table from a Discord Message
   * @param msg the message that was updated
   */
  public static async updateFromMsg(msg: DiscordMessage): Promise<void> {
    const message = await Message.findOne({
      where: { id: msg.id }
    });

    if (message === null) return;

    const transaction = await sequelize.transaction();

    try {
      await message.setUsers(getMembers(msg), { transaction  });
      await message.update({  message: msg.content }, { transaction });

      await transaction.commit();
    } catch (error) {
      console.error(error);
      await transaction.rollback();
    }
  }
}

Message.init({
  channel: { type: STRING },
  id: {
    primaryKey: true,
    type: TEXT
  },
  message: {
    allowNull: false,
    type: TEXT
  }
}, {
  sequelize
});

// tslint:disable-next-line:ordered-imports
import { Room } from "./room";
import { User } from "./user";

Message.belongsTo(User, { as: "Sender" });

Message.belongsToMany(User, { through: "UserMessage" });

Message.belongsTo(Room);
