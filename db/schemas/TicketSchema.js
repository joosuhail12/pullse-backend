const { v4: uuid } = require('uuid');
const { Status: TicketStatus, EntityType } = require('../../constants/TicketConstants');

const TicketSchema = {
    fields: {
        id: {
            type: String,
            required: true,
            index: true,
            default: function() {
                return uuid()
            }
        },
        sno: {
            type: Number,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
        },
        entityType: {
            type: String,
            default: EntityType.ticket
        },
        typeId: {
            type: String,
        },
        statusId: {
            type: String,
        },
        status: {
            type: String,
            default: TicketStatus.open
        },
        customerId: {
            type: String,
        },
        sessionId: {
            type: String,
        },
        trackingId: {
            type: Number,
        },
        externalId: {
            type: String,
        },
        language: {
            type: String,
        },
        priority: {
            type: Number,
            default: 0
        },
        teamId: {
            type: String,
        },
        chatbotId: {
            type: String,
        },
        threadId: {
            type: String,
        },
        assigneeTo: {
            type: String,
        },
        assigneeId: {
            type: String,
        },
        companyId: {
            type: String,
        },
        topicIds: [{
            type: String,
        }],
        tagIds: [{
            type: String,
        }],
        mentionIds: [{
            type: String,
        }],
        workspaceId: {
            type: String,
            required: true,
        },
        clientId: {
            type: String,
            required: true,
        },
        unread: {
            type: Number,
            default: 0
        },
        lastMessage: {
            type: String,
        },
        lastMessageAt: {
            type: Date
        },
        lastMessageBy: {
            type: String,
        },
        channel: {
            type: String,
        },
        device: {
            type: String,
        },
        summary: {
            type: String,
        },
        intents: [{
            key: {
                type: String,
            },
            confidence: {
                type: Number,
            },
        }],
        sentiment: {
            text: {
                type: String,
            },
            score: {
                type: Number,
            },
            lastAt: {
                type: Date,
            },
        },
        reopen: {
            count: {
                type: Number,
            },
            lastAt: {
                type: Date,
            },
        },
        sentiment: {
            text: {
                type: String,
            },
            score: {
                type: Number,
            },
        },
        qa: {
            count: {
                type: Number,
            },
            lastAt: {
                type: Date,
            },
            language: {
                type: Number,
            },
            tone: {
                type: Number,
            },
            empathy: {
                type: Number,
            },
            feedback: {
                type: String,
            },
        },
        customFields: {
            type: Object,
        },
        createdBy: {
            type: String, // id of user
            required: true,
        },
        ticketCreatedBy: {
            type: String,
        },
        closedAt: {
            type: Date
        },
        deletedAt: {
            type: Date
        }
    },

    schemaName: "ticket",
    options: {
        timestamps: true
    },
    indexes: [
        {
            fields: { id: 1, deletedAt: 1},
            options: { unique: true }
        },
        // { to decide, add deletedAt or not
        //     fields: { sno: 1, clientId: 1, workspaceId: 1, deletedAt: 1},
        //     options: { unique: true }
        // }
    ]
};

module.exports = TicketSchema;
