module.exports.getMembers = msg => {
  let users = [];

  for (let member of msg.channel.members) {
    let user = member[1].user;
    if (user.bot !== true) {
      users.push(user.id);
    }
  }

  return users;
}