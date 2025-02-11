const Handler = require('../../handlers/EmailChannelHandler');

const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');

async function activate(app) {

    let handler = new Handler();

    let base_url = '/api/email-channel'
    app.route({
        url: base_url,
        method: 'POST',
        name: "CreateEmailChannel",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            operationId: "CreateEmailChannel",
            tags: ['EmailChannel'],
            summary: 'Create EmailChannel',
            description: 'API to create email channel.',
            required: ['supportEmailAddress', 'selectedDomain'],
            body: {
                additionalProperties: false,
                type: 'object',
                properties: {
                    channelName: {
                        type: 'string',
                    },
                    senderName: {
                        type: 'string',
                        minLength: 2
                    },
                    senderEmailAddress: {
                        type: 'string',
                        minLength: 2
                    },
                    domainId: {
                        type: 'string',
                        minLength: 2
                    },
                    teamId: {
                        type: 'string',
                    },

                }
            },
            query: {
                workspace_id: {
                    type: 'string',
                    // required: true
                },
            }
        },
        handler: async (req, reply) => {
            return handler.createEmailChannel(req, reply);
        }
    });

    app.route({
        url: base_url,
        method: 'DELETE',
        name: "DeleteEmailChannel",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            operationId: "DeleteEmailChannel",
            tags: ['DeleteEmailChannel'],
            summary: 'Delete EmailChannel',
            description: 'API to delete email channel.',
            required: ['id'],
            body: {
                additionalProperties: false,
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        minLength: 2
                    }
                }
            },
            query: {
                workspace_id: {
                    type: 'string',
                    // required: true
                },
            }
        },
        handler: async (req, reply) => {
            return handler.deleteEmailChannel(req, reply);
        }
    });

    app.route({
        url: base_url,
        method: 'GET',
        name: "GetEmailChannel",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            operationId: "GetEmailChannel",
            tags: ['GetEmailChannel'],
            summary: 'Get EmailChannel',
            description: 'API to get all email channels.',
            query: {
                workspace_id: {
                    type: 'string',
                    // required: true
                },
            }
        },
        handler: async (req, reply) => {
            return handler.getAllEmailChannel(req, reply);
        }
    });

    app.route({
        url: base_url + '/:id',
        method: 'GET',
        name: "GetEmailChannelById",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            operationId: "GetEmailChannelById",
            tags: ['GetEmailChannelById'],
            summary: 'Get EmailChannel By Id',
            description: 'API to get email channel by id.',
            required: ['id'],
            query: {
                workspace_id: {
                    type: 'string',
                    // required: true
                },
            }
        },
        handler: async (req, reply) => {
            return handler.getEmailChannelById(req, reply);
        }
    })

    app.route({
        url: base_url + '/:id',
        method: 'POST',
        name: "UpdateEmailChannelById",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            operationId: "UpdateEmailChannelById",
            tags: ['UpdateEmailChannelById'],
            summary: 'Update EmailChannel By Id',
            description: 'API to update email channel by id.',
            required: ['id'],
            body: {
                additionalProperties: false,
                type: 'object',
                properties: {
                    channelName: {
                        type: 'string',
                    },
                    senderName: {
                        type: 'string',
                        minLength: 2
                    },
                    senderEmailAddress: {
                        type: 'string',
                        minLength: 2
                    },
                    domainId: {
                        type: 'string',
                        minLength: 2
                    },
                    teamId: {
                        type: 'string',
                    },
                    isEnabled: {
                        type: 'boolean',
                    }
                }
            },
            query: {
                workspace_id: {
                    type: 'string',
                    // required: true
                },
            }
        },
        handler: async (req, reply) => {
            return handler.updateEmailChannelById(req, reply);
        }
    })
}

module.exports = {
    activate
};