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

  User.associate = models => {
    User.belongsToMany(models.Message, {
      through: "UserMessage"
    });
  }

  return User;
};