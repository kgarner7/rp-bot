module.exports = (sequelize, Sq) => {
  const User = sequelize.define("user", {
    id: {
      primaryKey: true,
      type: Sq.STRING
    },
    name: {
      allowNull: false,
      type: Sq.TEXT
    }
  });

  return User;
};