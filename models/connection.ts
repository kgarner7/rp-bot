import Sequelize from 'sequelize';
import { database, config as settings } from '../config/config';
import { Client } from 'pg'; 

const env: string = process.env.NODE_ENV || 'development';
const config = database[env];
let dbName = `discordo-${settings.guildName.replace(/\ /g, "-")}`;

export default new Sequelize.Sequelize(dbName, config.username, config.password, config.options);
export const Op = Sequelize.Op;

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