import { getMembers } from '../helper';
import sequelize from './connection';
import { Message as DiscordMessage } from 'discord.js';
import {
  Model,
  STRING,
  TEXT,
  BelongsTo,
  BelongsToMany,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BelongsToCreateAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyCreateAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin
} from 'sequelize';

/**
 * Database model representing a Discord message
 * room {Room}: the room in which this message was sent
 * sender {User}: the user who sent this message
 * users {User[]}: list of all the users currently in the room when this message was sent
 */
export class Message extends Model {
  static associations: {
    room: BelongsTo
    sender: BelongsTo
    users: BelongsToMany
  }

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
   * @param {DiscordMessage} msg the discord message source
   */
  static async createFromMsg(msg: DiscordMessage) {
    let transaction = await sequelize.transaction();
    let users = getMembers(msg);

    try {
      let message: Message = await Message.create({
        RoomId: msg.channel.id,
        id: msg.id,
        message: msg.content,
        SenderId: msg.author.id
      }, {
        transaction: transaction
      });

      await message.addUsers(users, { transaction: transaction });
      await transaction.commit();
    } catch(err) {
      await transaction.rollback();
    }
  }

  /**
   * Updates the Message table from a Discord Message
   * @param {DiscordMessage} msg the message that was updated
   */
  static async updateFromMsg(msg: DiscordMessage) {
    let message: Message | null = await Message.findOne({
      where: {
        id: msg.id
      }
    });

    if (message === null) {
      return;
    }

    let transaction = await sequelize.transaction();

    try {
      await message.setUsers(getMembers(msg), {
        transaction: transaction
      });

      await message.update({
        message: msg.content
      }, {
        transaction: transaction
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
    }
  }
}

Message.init({
  channel: {
    type: STRING
  },
  id: {
    primaryKey: true,
    type: TEXT
  },
  message: {
    allowNull: false,
    type: TEXT
  }
}, {
  sequelize,
});

import { User } from './user';
import { Room } from './room';

Message.belongsTo(User, {
  as: "Sender"
});

Message.belongsToMany(User, {
  through: "UserMessage"
});

Message.belongsTo(Room);