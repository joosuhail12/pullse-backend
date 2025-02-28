const prompts = require('prompts');
const UserRoleService = require('../services/UserRoleService');

const inputFields = [
  {
    type: 'text',
    name: 'name',
    message: 'Role Name:',
  },
  {
    type: 'text',
    name: 'description',
    message: 'Description:',
  },
];

const adminSeeder = async () => {
  try {
    const response = await prompts(inputFields, {
      onCancel: () => {
        console.log('Request cancelled.');
        process.exit();
      },
    });

    response.createdBy = "CLI"; // Ensure consistency with Supabase schema

    const roleInst = new UserRoleService();
    let role = await roleInst.createRole(response);

    console.log("Role created successfully:", role);
    process.exit();
  } catch (err) {
    console.error("Error while creating admin:", err);
    process.exit(1);
  }
};

adminSeeder();
