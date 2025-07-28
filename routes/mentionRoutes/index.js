const Handler = require('../../handlers/MentionHandler');
const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {
    let handler = new Handler();
    let base_url = '/api/mentions';

    // Get mentions for the logged-in user
    app.route({
        url: base_url,
        method: 'GET',
        name: "GetUserMentions",
        preHandler: authMiddlewares.checkClerkToken(AuthType.user),
        schema: {
            tags: ['mentions'],
            summary: 'Get User Mentions',
            description: 'API to fetch all mentions for the current user.',
            query: {
                ticket_id: {
                    type: 'string',
                    description: 'Filter mentions by specific ticket ID'
                },
                user_id: {
                    type: 'string',
                    description: 'Filter mentions for specific user ID'
                },
                status: {
                    type: 'string',
                },
                is_read: {
                    type: 'string',
                    enum: ['true', 'false']
                },
                skip: {
                    type: 'number'
                },
                limit: {
                    type: 'number'
                }
            }
        },
        handler: async (req, reply) => {
            return handler.getUserMentions(req, reply);
        }
    });

    // Mark a mention as read
    app.route({
        url: base_url + '/:mention_id/read',
        method: 'PUT',
        name: "MarkMentionAsRead",
        preHandler: authMiddlewares.checkClerkToken(AuthType.user),
        schema: {
            tags: ['mentions'],
            summary: 'Mark Mention as Read',
            description: 'API to mark a mention as read.',
            params: {
                type: 'object',
                properties: {
                    mention_id: {
                        type: 'string'
                    }
                }
            }
        },
        handler: async (req, reply) => {
            return handler.markMentionAsRead(req, reply);
        }
    });

    // Create a new mention
    app.route({
        url: base_url,
        method: 'POST',
        name: "CreateMention",
        preHandler: authMiddlewares.checkClerkToken(AuthType.user),
        schema: {
            tags: ['mentions'],
            summary: 'Create Mention',
            description: 'API to create a new mention.',
            consumes: ['application/json'],
            body: {
                type: 'object',
                required: ['ticketId', 'userId'],
                properties: {
                    ticketId: {
                        type: 'string'
                    },
                    userId: {
                        type: 'string'
                    },
                    mentionId: {
                        type: 'string',
                        description: 'Optional mention ID'
                    },
                    mentionedBy: {
                        type: 'string',
                        description: 'ID of the user who created the mention (defaults to authenticated user if not provided)'
                    },
                    content: {
                        type: 'string'
                    }
                }
            }
        },
        config: {
            // Explicitly disable file upload for this route
            disableFileUpload: true
        },
        handler: async (req, reply) => {
            return handler.createMention(req, reply);
        }
    });

    // Update an existing mention
    app.route({
        url: base_url + '/:mention_id',
        method: 'PUT',
        name: "UpdateMention",
        preHandler: authMiddlewares.checkClerkToken(AuthType.user),
        schema: {
            tags: ['mentions'],
            summary: 'Update Mention',
            description: 'API to update an existing mention.',
            consumes: ['application/json'],
            params: {
                type: 'object',
                properties: {
                    mention_id: {
                        type: 'string'
                    }
                }
            },
            body: {
                type: 'object',
                properties: {
                    content: {
                        type: 'string',
                        description: 'Updated content of the mention'
                    },
                    isRead: {
                        type: 'boolean',
                        description: 'Mark the mention as read or unread'
                    },
                    ticketId: {
                        type: 'string',
                        description: 'ID of the ticket to associate with this mention'
                    },
                    userId: {
                        type: 'string',
                        description: 'ID of the user being mentioned'
                    },
                    mentionedBy: {
                        type: 'string',
                        description: 'ID of the user who created the mention'
                    }
                }
            }
        },
        config: {
            // Explicitly disable file upload for this route
            disableFileUpload: true
        },
        handler: async (req, reply) => {
            return handler.updateMention(req, reply);
        }
    });
}

module.exports = {
    activate
}; 