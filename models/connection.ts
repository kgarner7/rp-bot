import { Client } from "pg";
import Sequelize from "sequelize";

import { config as settings, database } from "../config/config";
import { Undefined } from "../helpers/types";

const nodeEnvironment: Undefined<string> = process.env.NODE_ENV,
  env = nodeEnvironment === undefined ? "development" : nodeEnvironment,
  config = database[env],
  dbName = `discordo-${settings.guildName.replace(/\ /g, "-")}`;

/**
 * The base database instance
 * Should only be used after calling initDB
 */
export const sequelize = new Sequelize.
  Sequelize(dbName, config.username, config.password, config.options);

/**
 * Attempts to create a new database for this server
 * If there is a duplicate, silently ignores the error
 */
export async function initDB(): Promise<void> {
  const conn = new Client({
    database: "postgres",
    password: config.password,
    user: config.username
  });

  await conn.connect();
  try {
    await conn.query(`CREATE DATABASE "${dbName}";`);
  } catch (err) {
    console.error((err as Error).stack);
  } finally {
    await conn.end();
  }
}
