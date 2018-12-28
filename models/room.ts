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
  BelongsTo
} from 'sequelize';
import sequelize from './connection';
import * as Discord from 'discord.js';

export class Room extends Model {
  static associations: {
    messages: HasMany;
    sources: HasMany;
    targets: HasMany;
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
import { Link } from './link';

Room.hasMany(Message);

Room.hasMany(Link, {
  as: "sources"
});

Room.hasMany(Link, {
  as: "targets"
});