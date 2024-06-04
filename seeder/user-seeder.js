const prompts = require('prompts');

const db = require('../db');
const config = require('../config');
const UserService = require('../services/UserService');

var inputFields = [{
    type: 'text',
    name: 'fName',
    message: 'User First name:'
  },
  {
    type: 'text',
    name: 'lName',
    message: 'User Last name:'
  },
  {
    type: 'text',
    name: 'email',
    message: 'User E-mail:'
  },
  {
    type: 'text',
    name: 'password',
    message: 'User Password:'
  },
  {
    type: 'text',
    name: 'role',
    message: 'Role:'
  },
];

var userSeeder = () => {

  const onCancel = async () => {
    await db.disconnect();
    console.log('Request cancelled.');
    process.exit();
  }

  (async () => {
    try {
      await db.connect(config.db);
      const response = await prompts(inputFields, { onCancel });
      response.createdBy = "CLI";

      const userInst = new UserService();
      let user = await userInst.createUser(response);
      console.log("User created successful", user);
      process.exit();
    } catch (err) {
      console.log(err);
      console.log("Error while creating user");
      process.exit(err);
    }
  })();
}

userSeeder();