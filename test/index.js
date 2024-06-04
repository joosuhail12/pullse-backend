// const Config = require('./config')
const { fakerEN_IN, faker } = require('@faker-js/faker');
/*


fakerEN_IN.phone.number()
fakerEN_IN.location.city()
fakerEN_IN.location.state()
fakerEN_IN.location.zipCode()


faker.location.country()


faker.lorem.paragraph()
faker.lorem.sentences()
faker.lorem.lines()
faker.lorem.sentence()

fakerEN_IN.word.noun()
fakerEN_IN.word.adjective()
fakerEN_IN.word.adverb()

*/
let password = faker.internet.password();
let email = (fakerEN_IN.person.firstName() + "@pullse.ai").toLocaleLowerCase()
const Config = {
  globalAdmin: {
    // username: "global-admin@pullse.ai",
    // password: "pullse@testing"
    username: "utkarsh@pullse.ai",
    password: "testing@123"
  },
  client: {
    name: faker.company.name(),
    status: 'active',
    owner: {
      fName: fakerEN_IN.person.firstName(),
      lName: fakerEN_IN.person.lastName(),
      email: fakerEN_IN.internet.email().toLocaleLowerCase(),
      password
    },
  },
  agent: {
    first_name: fakerEN_IN.person.firstName(),
    last_name: fakerEN_IN.person.lastName(),
    email: fakerEN_IN.internet.email().toLocaleLowerCase(),
    password,
    confirm_password: password,
    role: faker.person.jobTitle(),
  },
  customerEmails: [],
};



const BASE_URL = 'http://127.0.0.1:4000';
// const BASE_URL = 'https://dev.pullseai.com';
// const BASE_URL = 'http://api.pullse.ai';
const LOGIN_ENDPOINT = '/api/auth/login';
const CLIENT_CREATION_ENDPOINT = '/api/client';
const USER_CREATION_ENDPOINT = '/api/user';
const WORKSPACE_CREATION_ENDPOINT = '/api/workspace';
const TAG_CREATION_ENDPOINT = '/api/tag';
const TICKET_TYPE_CREATION_ENDPOINT = '/api/ticket-type';
const TICKET_TOPIC_CREATION_ENDPOINT = '/api/ticket-topic';
const COMPANY_CREATION_ENDPOINT = '/api/company';
const CUSTOMER_CREATION_ENDPOINT = '/api/customer';
const CONVERSATION_ADD_MESSAGE_ENDPOINT = '/api/conversation/message/new-ticket';

const axios = require('axios');
const chai = require('chai');
const { parse } = require('papaparse');
const should = chai.should();

function getConfig(uri, method = 'get', data = {}, authToken = null) {
  let config = {
    method,
    url: `${BASE_URL}${uri}`,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
    },
    data
  };
  return config;
}

describe('Create Organization by Global Admin', () => {
  let accessToken;

  before(async () => {
    // Log in as the global admin to get the access token
    const loginData = { username: Config.globalAdmin.username, password: Config.globalAdmin.password };
    const loginConfig = getConfig(LOGIN_ENDPOINT, 'post', loginData);

    const loginResponse = await axios.request(loginConfig);
    loginResponse.status.should.equal(200, `Login failed with status code ${loginResponse.status}`);
    accessToken = loginResponse.data.data.accessToken.token;
  });

  it('Should create a client with its owner', async () => {
    const clientData = Config.client;
    const clientConfig = getConfig(CLIENT_CREATION_ENDPOINT, 'post', clientData, accessToken);
    const startTime = Date.now();

    let response;
    try {
      response = await axios.request(clientConfig);

      const responseTime = Date.now() - startTime;
      const MAX_ACCEPTABLE_RESPONSE_TIME = 1000; // Adjust this value based on your requirement
      // responseTime.should.be.below(MAX_ACCEPTABLE_RESPONSE_TIME, `Response took too long: ${responseTime}ms`);

      response.status.should.equal(200, `Expected status code to be 200 for client creation but got ${response.status}`);
      should.exist(response.data, "Response data should not be undefined");
      // Assume that the response will have the client's data including its owner
      // should.exist(response.data.data, "Response data.data should not be undefined");
      // should.exist(response.data.data.client, "Response data.data.client should not be undefined");
      // Add more assertions as necessary for the client and owner data
    } catch (error) {
      throw new Error(`API call failed: ${error}`);
    }
  });



  // More tests can be added here if necessary
});

describe('Client Owner Login', async () => {
  let ownerToken, tagId, ticketTypeId, companyId, customerId, ticketId, workspaceId;

  it('Should able to login and get access token', async () => {
    let data = { username: Config.client.owner.email, password };
    let config = getConfig(LOGIN_ENDPOINT, 'post', data);

    let startTime = Date.now(); // Start the timer

    let response;
    try {
        response = await axios.request(config);

        let responseTime = Date.now() - startTime; // Calculate the response time

        // Check the status code
        response.status.should.equal(200, `Expected status code to be 200 but got ${response.status}`);

        // Check the response time
        const MAX_ACCEPTABLE_RESPONSE_TIME = 500;  // Set your max acceptable response time (in ms) here
        // responseTime.should.be.below(MAX_ACCEPTABLE_RESPONSE_TIME, `Response took too long: ${responseTime}ms`);

        // Other checks...
        should.exist(response.data, "Response data should not be undefined");
        should.exist(response.data.data, "Response data.data should not be undefined");
        should.exist(response.data.data.accessToken, "Response data.data.accessToken should not be undefined");
        should.exist(response.data.data.accessToken.token, "Response data.data.accessToken.token should not be undefined");
        ownerToken = response.data.data.accessToken.token
        // response.data.data.accessToken.token.should.not.be.null;
    } catch (error) {
        throw new Error(`API call failed: ${error}`);
    }
  });

  it('Should able to create agents', async () => {
    // owner creates a user
    let config = getConfig(USER_CREATION_ENDPOINT, 'post', Config.agent, ownerToken);
    response = await axios.request(config);
    response.status.should.equal(200, `Expected status code to be 200 but got ${response.status}`);
  });

  it('Should able to create workspaces', async () => {
    let requests = [];
    for (let i = 0; i < 3; i++) {
      let config = getConfig(WORKSPACE_CREATION_ENDPOINT, 'post', { name: `Workspace ${i+1}`, description: faker.lorem.sentence() }, ownerToken);
      requests.push(axios.request(config))
    }
    const responses = await Promise.all(requests);
    responses.forEach((res) => {
        res.status.should.equal(200, `Expected status code to be 200 for client creation but got ${response.status}`);
    });
    workspaceId = responses[0].data.data.id;
  });

  it('Should able to create tags', async () => {
    let requests = [];
    for (let i = 0; i < 3; i++) {
      let config = getConfig(TAG_CREATION_ENDPOINT+"?workspace_id="+workspaceId, 'post', { name: `${fakerEN_IN.word.adjective()}`, description: faker.lorem.sentence() }, ownerToken);
      requests.push(axios.request(config))
    }
    const responses = await Promise.all(requests);
    responses.forEach((res) => {
        res.status.should.equal(200, `Expected status code to be 200 for client creation but got ${response.status}`);
    });
    tagId = responses[0].data.data.id;
  });

  it('Should able to create ticket types', async () => {
    let requests = [];
    for (let i = 0; i < 3; i++) {
      let config = getConfig(TICKET_TYPE_CREATION_ENDPOINT+"?workspace_id="+workspaceId, 'post', { name: `${fakerEN_IN.word.adjective()}`, description: faker.lorem.sentence() }, ownerToken);
      requests.push(axios.request(config))
    }
    const responses = await Promise.all(requests);
    responses.forEach((res) => {
      res.status.should.equal(200, `Expected status code to be 200 for client creation but got ${response.status}`);
    });
    ticketTypeId = responses[0].data.data.id;
  });

  it('Should able to create ticket topic', async () => {
    let requests = [];
    for (let i = 0; i < 3; i++) {
      let config = getConfig(TICKET_TOPIC_CREATION_ENDPOINT+"?workspace_id="+workspaceId, 'post', { name: `${fakerEN_IN.word.adverb()}`, description: faker.lorem.sentence() }, ownerToken);
      requests.push(axios.request(config))
    }
    const responses = await Promise.all(requests);
    responses.forEach((res) => {
      res.status.should.equal(200, `Expected status code to be 200 for client creation but got ${response.status}`);
    });
    tagId = responses[0].data.data.id;
  });

  it('Should able to create companies', async () => {
    let requests = [];
    for (let i = 0; i < 5; i++) {
      let data = {
        name: faker.company.name(),
        description: faker.lorem.sentence(),
        phone: fakerEN_IN.phone.number(),
        numberOfEmployees: parseInt(faker.number.octal()),
        annualRevenue: 1000,
        websites: ["https://pullseai.com", "https://www.pullse.ai"],
        notes: faker.lorem.paragraph(),
        accountTier: "accountTier",
        industry: faker.person.jobType(),
        address: faker.lorem.sentence(),
        city: fakerEN_IN.location.city(),
        state: fakerEN_IN.location.state(),
        zipcode: fakerEN_IN.location.zipCode(),
        country: faker.location.country(),
        tagIds: [tagId]
      };
      let config = getConfig(COMPANY_CREATION_ENDPOINT+"?workspace_id="+workspaceId, 'post', data, ownerToken);
      requests.push(axios.request(config))
    }
    const responses = await Promise.all(requests);
    responses.forEach((res) => {
      res.status.should.equal(200, `Expected status code to be 200 for client creation but got ${response.status}`);
    });
    companyId = responses[0].data.data.id;
  });

  it('Should able to create customers', async () => {
    let requests = [];
    let types = [ "customer", "lead", "visitor"]
    let typeSno = 0;
    for (let i = 0; i < 3; i++) {
      if (i%10==0) {
        typeSno++;
      }
      let data = {
        name: fakerEN_IN.person.firstName() + " " + fakerEN_IN.person.lastName(),
        email: fakerEN_IN.internet.email(),
        type: types[typeSno],
        phone: fakerEN_IN.phone.number(),
        // phoneCountry: null,
        notes: faker.lorem.paragraph(),
        companyId: companyId
      };
      let config = getConfig(CUSTOMER_CREATION_ENDPOINT+"?workspace_id="+workspaceId, 'post', data, ownerToken);
      requests.push(axios.request(config))
      Config.customerEmails.push(data.email);
    }
    const responses = await Promise.all(requests);
    responses.forEach((res) => {
      res.status.should.equal(200, `Expected status code to be 200 for client creation but got ${response.status}`);
    });
    customerId = responses[0].data.data.id;
  });

  it('Should able to create ticket', async () => {
    let requests = [];
    for (let i = 0; i < Config.customerEmails.length; i++) {
      let customerEmail = Config.customerEmails[i];
      let data = {
        message: `Hi myself ${fakerEN_IN.person.firstName()}. My email is ${customerEmail}` + faker.lorem.paragraph(),
        message_type: "text"
      };
      let config = getConfig(CONVERSATION_ADD_MESSAGE_ENDPOINT+"?workspace_id="+workspaceId, 'post', data, customerEmail);
      requests.push(axios.request(config))
    }
    const responses = await Promise.all(requests);
    responses.forEach((res) => {
      res.status.should.equal(200, `Expected status code to be 200 for client creation but got ${response.status}`);
    });
    ticketId = responses[0].data.data.id;
  });


});

