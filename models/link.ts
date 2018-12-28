import { 
  Model, 
  INTEGER,
  BelongsTo,
  BelongsToCreateAssociationMixin,
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BOOLEAN
} from 'sequelize';
import sequelize from './connection';

export class Link extends Model {
  static associations: {
    source: BelongsTo;
    target: BelongsTo;
  }

  public id: number;
  public locked: boolean;
  public createdAt?: Date;
  public updatedAt?: Date;

  public source: Room;
  public sourceId: string;
  public createSource: BelongsToCreateAssociationMixin<Room>;
  public getSource: BelongsToGetAssociationMixin<Room>;
  public setSource: BelongsToSetAssociationMixin<Room, string>;

  public target: Room;
  public targetId: string;
  public createTarget: BelongsToCreateAssociationMixin<Room>;
  public getTarget: BelongsToGetAssociationMixin<Room>;
  public setTarget: BelongsToSetAssociationMixin<Room, string>;
}

Link.init({
  id: {
    autoIncrement: true,
    primaryKey: true,
    type: INTEGER
  },
  locked: {
    allowNull: false,
    type: BOOLEAN
  }
}, { sequelize });

import { Room } from './room';

Link.belongsTo(Room, {
  as: "source"
});

Link.belongsTo(Room, {
  as: "target"
});