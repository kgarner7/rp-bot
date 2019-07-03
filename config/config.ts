import { Options } from "sequelize";

import { Dict } from "../helpers/base";

// tslint:disable-next-line:no-magic-numbers
const IDLE_TIME = 1000 * 10;
const MAX_POOLS = 15;

/**
 * Database configurations
 */
// tslint:disable:object-literal-sort-keys
export let database: Dict<{
  username: string;
  password: string;
  pool?: Dict<string | number>;
  options?: Options;
  retry?: object;
}> = {
  development: {
    username: "postgres",
    password: "postgres",
    pool: {
      max: MAX_POOLS,
      min: 0,
      idle: IDLE_TIME
    },
    options: {
      dialect: "postgres"
    }
  },
  recovery: {
    username: "postgres",
    password: "postgres",
    pool: {
      max: MAX_POOLS,
      min: 0,
      idle: IDLE_TIME
    },
    options: {
      dialect: "postgres",
      logging: false
    }
  },
  test: {
    username: "discordo_testing",
    password: "discordo_testing",
    pool: {
      max: MAX_POOLS,
      min: 0,
      idle: IDLE_TIME
    },
    options: {
      dialect: "postgres"
    }
  },
  production: {
    username: process.env.DB_USERNAME || "",
    password: process.env.DB_PASSWORD || "",
    pool: {
      max: MAX_POOLS,
      min: 0,
      idle: IDLE_TIME
    },
    options: {
      logging: false,
      dialect: "postgres"
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
  botToken: process.env.BOT_TOKEN === undefined ? "" : process.env.BOT_TOKEN,
  guildName: process.env.GUILD_NAME === undefined ? "" : process.env.GUILD_NAME,
  prefix: "!"
};
