import Sequelize from 'sequelize';
import { database, config as settings } from '../config/config';
import { Client } from 'pg';

const env: string = process.env.NODE_ENV || 'development';
const config = database[env];
let dbName = `discordo-${settings.guildName.replace(/\ /g, "-")}`;

/**
 * The base database instance
 * Should only be used after calling initDB
 */
export default new Sequelize.Sequelize(dbName, config.username, config.password, config.options);
export const Op = Sequelize.Op;

/**
 * Attempts to create a new database for this server
 * If there is a duplicate, silently ignores the error
 */
export async function initDB() {
  let conn = new Client({
    database: "postgres",
    password: config.password,
    user: config.username
  });

  await conn.connect();
  try {
    await conn.query(`CREATE DATABASE "${dbName}";`);
  } catch(err) {
    console.error((err as Error).stack);
  } finally {
    await conn.end();
  }
}