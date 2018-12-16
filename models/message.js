const { getMembers } = require("../helper");

module.exports = (sequelize, Sq) => {
  const Message = sequelize.define("message", {
    channelName: {
      type: Sq.STRING
    },
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
    Message.belongsToMany(models.User, {
      through: "UserMessage"
    });

    Message.createFromMsg = async msg => {
      let transaction = await sequelize.transaction();
      let users = getMembers(msg);

      try {
        let message = await Message.create({
          channelName: msg.channel.name,
          id: msg.id,
          message: msg.content
        }, {
          transaction: transaction
        });

        await message.addUsers(users, {transaction: transaction});
        transaction.commit();
      } catch(err) {
        await transaction.rollback();
      }
    };

    Message.updateFromMsg = async msg => {
      let message = await Message.findOne({
        include: {
          model: models.User
        },
        where: {
          id: msg.id
        }
      });
      
      let transaction = await sequelize.transaction();
    
      try {
        await message.setUsers(getMembers(msg), {
          transaction: transaction
        });
    
        await message.update({
          message: msg.content
        }, {
          transaction: transaction
        });

        await transaction.commit();
      } catch(err) {
        await transaction.rollback();
      }
    }
  };

  return Message;
};