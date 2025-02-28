require('dotenv').config();
const prompts = require('prompts');
const { createClient } = require('@supabase/supabase-js');
const ClientService = require("../services/ClientService");
const { Status } = require("../constants/ClientConstants");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_KEY:", process.env.SUPABASE_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

var clientInputFields = [
  {
    type: 'text',
    name: 'name',
    message: 'Client Name'
  },
];

var userInputFields = [
  {
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
    type: 'password',
    name: 'password',
    message: 'User Password:'
  },
];

var clientSeeder = async () => {
  const onCancel = () => {
    console.log('Request cancelled.');
    process.exit();
  };

  try {
    const clientInputResponse = await prompts(clientInputFields, { onCancel });
    clientInputResponse.createdBy = 'CLI';

    const userInputResponse = await prompts(userInputFields, { onCancel });
    userInputResponse.createdBy = 'CLI';

    const clientInst = new ClientService(supabase);
    await clientInst.createClient({
      ...clientInputResponse,
      owner: { ...userInputResponse },
      status: Status.ACTIVE,
    });

    console.log('Client Created');
    process.exit();
  } catch (err) {
    console.log(err);
    console.log('Error while creating client');
    process.exit(1);
  }
};

clientSeeder();
