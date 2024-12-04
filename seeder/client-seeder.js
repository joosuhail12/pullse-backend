const prompts = require('prompts');
const db = require('../db');
const config = require('../config');
const ClientService =  require("../services/ClientService");
const { Status } = require("../constants/ClientConstants");

var clientInputFields = [
  {
    type: 'text',
    name: 'name',
    message: 'Client Name'
  },
]

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
    type: 'text',
    name: 'password',
    message: 'User Password:'
  },
]

var clientSeeder = () => {

  const onCancel = async () => {
    await db.disconnect()
    console.log('Request cancelled.')
    process.exit();
  }

  (async () => {
    try {
      await db.connect(config.db);
      const clientInputResponse = await prompts(clientInputFields, { onCancel })
      clientInputResponse.createdBy = 'CLI';

      const userInputResponse = await prompts(userInputFields, { onCancel })
      userInputResponse.createdBy = 'CLI';

      const clientInst = new ClientService()
      await clientInst.createClient({
        ...clientInputResponse,
        owner: {...userInputResponse},
        status: Status.ACTIVE,
      })
      console.log('Client Created');
      process.exit();
    }catch(err) {
      console.log(err)
      console.log('Error while creating client')
      process.exit(err)
    }
  })()
}

clientSeeder()