const Handler = require('../../handlers/ClerkSyncHandler');

async function activate(app) {
    let handler = new Handler();
    let base_url = '/api/clerk-sync';

    // Create Clerk user and organization from backend
    app.route({
        url: base_url + "/create-user-org",
        method: 'POST',
        name: "CreateClerkUserAndOrg",
        schema: {
            tags: ['ClerkSync'],
            summary: 'Create Clerk User and Organization',
            description: 'Create user in Clerk and set up complete workspace from backend.',
            body: {
                type: 'object',
                required: ['firstName', 'lastName', 'username', 'email', 'password', 'companyName'],
                properties: {
                    firstName: {
                        type: 'string',
                        description: 'User first name',
                        minLength: 1
                    },
                    lastName: {
                        type: 'string',
                        description: 'User last name',
                        minLength: 1
                    },
                    username: {
                        type: 'string',
                        description: 'Unique username',
                        minLength: 3
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'User email address'
                    },
                    password: {
                        type: 'string',
                        description: 'User password',
                        minLength: 8
                    },
                    companyName: {
                        type: 'string',
                        description: 'Name of the company/organization',
                        minLength: 2
                    }
                }
            }
        },
        handler: async (req, reply) => {
            return handler.createUserAndOrganization(req, reply);
        }
    });

    // Get user organizations for org switcher
    app.route({
        url: base_url + "/user-organizations/:clerkUserId",
        method: 'GET',
        name: "GetUserOrganizations",
        schema: {
            tags: ['ClerkSync'],
            summary: 'Get User Organizations',
            description: 'Get list of organizations for user (for org switcher component).',
            params: {
                type: 'object',
                properties: {
                    clerkUserId: {
                        type: 'string',
                        description: 'Clerk user ID'
                    }
                }
            }
        },
        handler: async (req, reply) => {
            return handler.getUserOrganizations(req, reply);
        }
    });
}

module.exports = { activate }; 