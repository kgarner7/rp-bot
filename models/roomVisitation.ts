import { Model, BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin } from "sequelize";

import { sequelize } from "./connection";

export class RoomVisitation extends Model {
  public id: number;
  public createdAt?: Date;
  public updatedAt?: Date;

  public Room: Room;
  public RoomId: number;
  public createRoom: BelongsToCreateAssociationMixin<Room>;
  public getRoom: BelongsToGetAssociationMixin<Room>;
  public setRoom: BelongsToSetAssociationMixin<Room, string>;

  public User: User;
  public UserId: number;
  public createUser: BelongsToCreateAssociationMixin<User>;
  public getUser: BelongsToGetAssociationMixin<User>;
  public setUser: BelongsToSetAssociationMixin<User, string>;
}

RoomVisitation.init({}, {
  sequelize
});

import { Room } from "./room";
import { User } from "./user";

RoomVisitation.belongsTo(Room);

RoomVisitation.belongsTo(User);