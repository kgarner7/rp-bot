module.exports = (sequelize, Sq) => {
  const Message = sequelize.define("message", {
    id: {
      primaryKey: true,
      type: Sq.TEXT
    },
    message: {
      allowNull: false,
      type: Sq.TEXT,
    }
  });

  Message.associate = models => {
    console.log(models);
    Message.hasMany(models.User);
  };

  return Message;
};