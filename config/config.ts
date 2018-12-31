import { Options } from "sequelize";

import { Dict } from "../helper";

/**
 * Database configurations
 */
// tslint:disable:object-literal-sort-keys
export let database: Dict<{
  username: string;
  password: string;
  options?: Options;
}> = {
  development: {
    username: "discordo",
    password: "discordo",
    options: {
      dialect: "postgres",
      operatorsAliases: false
    }
  },
  test: {
    username: "discordo_testing",
    password: "discordo_testing",
    options: {
      dialect: "postgres",
      operatorsAliases: false
    }
  },
  production: {
    username: process.env.DB_USERNAME || "",
    password: process.env.DB_PASSWORD || "",
    options: {
      dialect: "postgres",
      operatorsAliases: false
    }
  }
};

/**
 * General environment configurations
 */
export let config: {
  botToken: string;
  guildName: string;
  prefix: string;
} = {
  botToken: process.env.BOT_TOKEN === undefined ? "": process.env.BOT_TOKEN,
  guildName: process.env.GUILD_NAME === undefined ? "": process.env.GUILD_NAME,
  prefix: "!"
};
