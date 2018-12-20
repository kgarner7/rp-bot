import { 
  Model, 
  STRING, 
  TEXT, 
  HasMany, 
  HasManySetAssociationsMixin, 
  HasManyAddAssociationMixin, 
  HasManyCreateAssociationMixin, 
  HasManyGetAssociationsMixin, 
  BelongsToMany, 
  BelongsToManyAddAssociationMixin, 
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCreateAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManySetAssociationsMixin, 
  HasManyAddAssociationsMixin,
  BelongsToManyRemoveAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin
} from 'sequelize';

import { GuildMember } from 'discord.js';
import sequelize from './connection';

export class User extends Model {
  static associations: {
    messages: BelongsToMany
    sentMessages: HasMany
  }

  public id: string;
  public name: string;
  public createdAt: Date;
  public updatedAt: Date;

  public Messages: Message[];
  public addMessage: BelongsToManyAddAssociationMixin<Message, string>;
  public addMessages: BelongsToManyAddAssociationsMixin<Message, string>;
  public createMessage: BelongsToManyCreateAssociationMixin<Message>;
  public getMessages: BelongsToManyGetAssociationsMixin<Message>;
  public removeMessage: BelongsToManyRemoveAssociationMixin<Message, string>;
  public removeMessages: BelongsToManyRemoveAssociationsMixin<Message, string>; 
  public setMessages: BelongsToManySetAssociationsMixin<Message, string>;
  
  public sentMessages: Message[];
  public addSentMessage: HasManyAddAssociationMixin<Message, string>;
  public addSentMessages: HasManyAddAssociationsMixin<Message, string>;
  public createSentMessage: HasManyCreateAssociationMixin<Message>;
  public getSentMessages: HasManyGetAssociationsMixin<Message>;
  public removeSentMessage: HasManyRemoveAssociationMixin<Message, string>;
  public removeSentMessages: HasManyRemoveAssociationsMixin<Message, string>;
  public setSentMessages: HasManySetAssociationsMixin<Message, string>;

  static createFromMember(member: GuildMember) {
    if (member.user.bot !== true) {
      User.findOrCreate({
        defaults: {
          id: member.id
        }, 
        where: {
          name: member.displayName
        }
      });
    }
  }
}

User.init({
  id: {
    primaryKey: true,
    type: STRING
  },
  name: {
    allowNull: false,
    type: TEXT
  }
}, { 
  sequelize, 
});

import { Message } from "./message";

User.hasMany(Message, {
  as: "sentMessages"
});

User.belongsToMany(Message, {
  through: "UserMessage"
});