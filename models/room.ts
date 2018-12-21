import { Model, 
  HasMany, 
  HasManyAddAssociationMixin, 
  HasManyAddAssociationsMixin, 
  HasManyCreateAssociationMixin, 
  HasManyGetAssociationsMixin, 
  HasManyRemoveAssociationMixin, 
  HasManyRemoveAssociationsMixin, 
  HasManySetAssociationsMixin, 
  STRING,
  TEXT
} from 'sequelize';
import sequelize from './connection';
import * as Discord from 'discord.js';

export class Room extends Model {
  static associations: {
    messages: HasMany
  }

  public discordName: string;
  public id: string;
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

  static async createFromChannel(channel: Discord.GuildChannel) {
    if (channel instanceof Discord.TextChannel) {
      Room.findOrCreate({
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

Room.hasMany(Message);
