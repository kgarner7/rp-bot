import Sequelize from 'sequelize';
import { database } from '../config/config';

const env: string = process.env.NODE_ENV || 'development';
const config = database[env];

export default new Sequelize.Sequelize(config.database, config.username, config.password, config.options);

export const Op = Sequelize.Op;