const Handler = require('../../handlers/ClerkAuthHandler');

async function activate(app) {
    let handler = new Handler();
    let base_url = '/api/clerk-auth';

    // Clerk login
    app.route({
        url: base_url + "/login",
        method: 'POST',
        name: "ClerkLogin",
        schema: {
            tags: ['ClerkAuth'],
            summary: 'Login with Clerk',
            description: 'Validate a Clerk session token and return user claims.',
            body: {
                type: 'object',
                required: ['clerkSessionToken'],
                properties: {
                    clerkSessionToken: {
                        type: 'string',
                        description: 'Clerk session token from frontend'
                    }
                }
            }
        },
        handler: async (req, reply) => {
            return handler.loginWithClerk(req, reply);
        }
    });

    // Get current Clerk user
    app.route({
        url: base_url + "/current-user",
        method: 'POST',
        name: "GetCurrentClerkUser",
        schema: {
            tags: ['ClerkAuth'],
            summary: 'Get Current Clerk User',
            description: 'Get current user info from Clerk and internal DB.',
            body: {
                type: 'object',
                required: ['clerkSessionToken'],
                properties: {
                    clerkSessionToken: {
                        type: 'string',
                        description: 'Clerk session token from frontend'
                    }
                }
            }
        },
        handler: async (req, reply) => {
            return handler.getCurrentUser(req, reply);
        }
    });

    // Clerk logout (no-op on backend)
    app.route({
        url: base_url + "/logout",
        method: 'POST',
        name: "ClerkLogout",
        schema: {
            tags: ['ClerkAuth'],
            summary: 'Logout Clerk User',
            description: 'Placeholder endpoint for client side logout.',
            body: {
                type: 'object',
                properties: {}
            }
        },
        handler: async (req, reply) => {
            return handler.logout(req, reply);
        }
    });

    // Check token (validate Clerk session token)
    app.route({
        url: base_url + "/check-token",
        method: 'POST',
        name: "CheckClerkToken",
        schema: {
            tags: ['ClerkAuth'],
            summary: 'Check Token Validity',
            description: 'Check if a Clerk session token is valid.',
            body: {
                type: 'object',
                properties: {
                    token: {
                        type: 'string',
                        description: 'Clerk session token to verify'
                    }
                }
            }
        },
        handler: async (req, reply) => {
            return handler.checkToken(req, reply);
        }
    });
}

module.exports = { activate }; 