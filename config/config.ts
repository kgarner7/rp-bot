/**
 * Database configurations
 */
export let database: {[env: string]: any} = {
  development: {
    username: "postgres",
    password: undefined,
    database: "discordo",
    host: "127.0.0.1",
    dialect: "postgres",
  },
  test: {
    username: "postgres",
    password: undefined,
    database: "discordo_testing",
    host: "127.0.0.1",
    dialect: "postgres"
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOSTNAME,
    dialect: "postgres"
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