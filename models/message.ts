import { getMembers } from "../helper";
import * as Sequelize from "sequelize";
import sequelize from './connection';
import * as Discord from "discord.js";
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
} from "sequelize";

export class Message extends Model {
  static tableName: string = "message";

  static associations: {
    sender: BelongsTo
    users: BelongsToMany
  }

  public channel: string;
  public id: string;
  public message: string;
  public createdAt: Date;
  public updatedAt: Date;

  public Users: User[];
  public addUser: BelongsToManyAddAssociationMixin<User, string>;
  public addUsers: BelongsToManyAddAssociationsMixin<User, string>;
  public createUser: BelongsToManyCreateAssociationMixin<User>;
  public getUsers: BelongsToManyGetAssociationsMixin<User>;
  public removeUser: BelongsToManyRemoveAssociationMixin<User, string>;
  public removeUsers: BelongsToManyRemoveAssociationsMixin<User, string>;
  public setUsers: BelongsToManySetAssociationsMixin<User, string>;

  public sender: User;
  public senderId: string;
  public createSender: BelongsToCreateAssociationMixin<User>;
  public getSender: BelongsToGetAssociationMixin<User>;
  public setSender: BelongsToSetAssociationMixin<User, string>;  

  static async createFromMsg(msg: Discord.Message) {
    let transaction = await sequelize.transaction();
    let users = getMembers(msg);
    
    try {
      let message: Message = await Message.create({
        channel: msg.channel.id,
        id: msg.id,
        message: msg.content,
        senderId: msg.author.id
      }, {
        transaction: transaction
      });

      await message.addUsers(users, {transaction: transaction});
      await transaction.commit();
    } catch(err) {
      await transaction.rollback();
    }
  }

  static async updateFromMsg(msg: Discord.Message) {
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

Message.belongsTo(User, {
  as: "sender"
});

Message.belongsToMany(User, {
  through: "UserMessage"
});