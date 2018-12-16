export default (sequelize, Sq) => {
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

    User.belongsTo(models.Message, {
      as: "sender"
    });

    User.createFromMember = member => {
      if (member.user.bot !== true) {
        User.findOrCreate({
          defaults: {
            id: member.id
          },
          where: {
            name: member.displayName
          }
        })
      }
    }
  }

  return User;
};