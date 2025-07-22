const Handler = require('../../handlers/ClerkAuthHandler');

async function activate(app) {
    let handler = new Handler();
    let base_url = '/api/clerk-auth';

    // Clerk login - returns same format as /api/auth/login
    app.route({
        url: base_url + "/login",
        method: 'POST',
        name: "ClerkLogin",
        schema: {
            tags: ['ClerkAuth'],
            summary: 'Login with Clerk',
            description: 'Login using Clerk session token, returns same format as regular login.',
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

    // Clerk logout
    app.route({
        url: base_url + "/logout",
        method: 'POST',
        name: "ClerkLogout",
        schema: {
            tags: ['ClerkAuth'],
            summary: 'Logout Clerk User',
            description: 'Logout user and revoke access token.',
            body: {
                type: 'object',
                required: ['accessToken'],
                properties: {
                    accessToken: {
                        type: 'string',
                        description: 'Access token to revoke'
                    }
                }
            }
        },
        handler: async (req, reply) => {
            return handler.logout(req, reply);
        }
    });

    // Check token (for middleware compatibility)
    app.route({
        url: base_url + "/check-token",
        method: 'POST',
        name: "CheckClerkToken",
        schema: {
            tags: ['ClerkAuth'],
            summary: 'Check Token Validity',
            description: 'Check if access token is valid (for middleware use).',
            body: {
                type: 'object',
                properties: {
                    token: {
                        type: 'string',
                        description: 'Access token to check'
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