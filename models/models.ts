import { User}  from './user';

User.findAll().then(u => {
  console.log(u);
});