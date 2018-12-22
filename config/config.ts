/**
 * Database configurations
 */
export let database: {[env: string]: any} = {
  development: {
    username: "discordo",
    password: "discordo",
    database: "discordo",
    options: {
      dialect: "postgres",
      operatorsAliases: false
    },
  },
  test: {
    username: "discordo_testing",
    password: "discordo_testing",
    database: "discordo_testing",
    options: {
      dialect: "postgres",
      operatorsAliases: false
    },
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: {
      dialect: "postgres",
      operatorsAliases: false
    },
  }
}

/**
 * General environment configurations
 */
export let config: {[env: string]: string} = {
  botToken: process.env.BOT_TOKEN || "",
  guildName: "testing nothing to see here",
  prefix: "!"
}