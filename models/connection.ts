import fs from 'fs';
import Sequelize from 'sequelize';
import { database } from '../config/config';

const env: string = process.env.NODE_ENV || 'development';
const config = database[env];
const sequelize = new Sequelize.Sequelize(config.database, config.username, config.password, config);

export default sequelize;