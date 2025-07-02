const Handler = require('../../handlers/PullseCrmHandler');

async function activate(app) {

    let handler = new Handler();

    let base_url = '/api/pullse'

    app.route({
        url: base_url + "/create-new-user",
        method: 'POST',
        name: "CreateNewUser",
        schema: {
            tags: ['Pullse'],
            summary: 'Create New User',
            description: 'API to create a new user.',
            required: ['name', 'email', 'company_name'],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                    company_name: { type: 'string' },
                }
            }
        },
        handler: async (req, reply) => {
            return handler.createNewUser(req, reply);
        }
    })
};

module.exports = {
    activate
};