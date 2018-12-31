import { Dict } from "../helper";

/**
 * Database configurations
 */
// tslint:disable-next-line:no-any
export let database: Dict<any> = {
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
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    options: {
      dialect: "postgres",
      operatorsAliases: false
    }
  }
};

/**
 * General environment configurations
 */
export let config: Dict<string> = {
  botToken: process.env.BOT_TOKEN || "",
  guildName: process.env.GUILD_NAME || "",
  prefix: "!"
};
