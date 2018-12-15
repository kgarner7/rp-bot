const Sequelize = require("sequelize");
const database = new Sequelize("discordo", "postgres", "", {
  "dialect": "postgres",
  "define": {
    "underscored": false,
    "charset": "utf8"
  }
});

let modules = [
  require("./message"),
  require("./user")
];

let models = {};

for (let module of modules) {
  let model = module(database, Sequelize);
  models[model.name.replace(/(^|\s)\S/g, l => l.toUpperCase())] = model;
}

Object.keys(models).forEach(key => {
  if ('associate' in models[key]) {
    models[key].associate(models);
  }
});

module.exports = {
  database: database,
  ...models
};