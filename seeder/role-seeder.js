const prompts = require('prompts');

const db = require('../db');
const config = require('../config');
const UserRoleService = require('../services/UserRoleService');

var inputFields = [{
    type: 'text',
    name: 'name',
    message: 'Role Name:'
  },
  {
    type: 'text',
    name: 'description',
    message: 'description:'
  },
];

var adminSeeder = () => {

  const onCancel = async () => {
    await db.disconnect();
    console.log('Request cancelled.');
    process.exit();
  }

  (async () => {
    try {
      await db.connect(config.db);
      const response = await prompts(inputFields, { onCancel });
      response.created_by = "CLI";

      const roleInst = new UserRoleService();
      let role = await roleInst.createRole(response);
      console.log("Role created successful", role);
      process.exit();
    } catch (err) {
      console.log(err);
      console.log("Error while creating admin");
      process.exit(err);
    }
  })();
}

adminSeeder();