const { v4: uuid } = require('uuid');
const { UserType } = require('../../constants/ClientConstants');

const ConversationSchema = {
    fields: {
        id: {
            type: String,
            required: true,
            index: true,
            default: function() {
                return uuid()
            }
        },
        ticketId: {
            type: String,
            required: true,
        },
        message: {
          type: String,
          required: true,
        },
        type: {
            type: String,
            required: true,
        },
        userType: {
          type: String,
          required: true,
        },
        visibleTo: {
            type: [{
                type: String,
                enum: [ UserType.agent, UserType.customer ]
            }],
            default: [ UserType.agent, UserType.customer ],
        },
        tagIds: [{
            type: String,
        }],
        mentionIds: [{
            type: String,
        }],
        createdBy: {
            type: String, // id of user
            required: true,
        },
        workspaceId: {
            type: String,
            required: true,
        },
        clientId: {
            type: String,
            required: true,
        },
        deletedAt: {
            type: Date
        }
    },
    schemaName: "conversation",
    options: {
        timestamps: true
    },
    indexes: [
        {
            fields: { id: 1, deletedAt: 1},
            options: { unique: true }
        }
    ]
};

module.exports = ConversationSchema;
