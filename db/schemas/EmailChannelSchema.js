const { default: mongoose } = require('mongoose');
const { v4: uuid } = require('uuid');

const EmailChannelSchema = {
    fields: {
        id: {
            type: String,
            required: true,
            index: true,
            default: function () {
                return uuid()
            }
        },
        channelName: {
            type: String,
            required: false,
        },
        senderName: {
            type: String,
            required: true,
        },
        senderEmailAddress: {
            type: String,
            required: true,
        },
        domainId: {
            type: String,
            required: true,
        },
        domainName: {
            type: String,
            required: true
        },
        teamId: {
            type: String,
        },
        teamName: {
            type: String
        },
        clientId: {
            type: String,
            required: true,
        },
        workspaceId: {
            type: String,
            required: true,
        },
        isEnabled: {
            type: Boolean,
            default: true
        },
        createdBy: {
            type: String, // id of user
            required: true,
        },
        archiveAt: {
            type: Date
        },
        deletedAt: {
            type: Date
        }
    },
    schemaName: "emailChannel",
    options: {
        timestamps: true
    },
    indexes: [
        {
            fields: { id: 1, deletedAt: 1 },
            options: { unique: true }
        }
    ]
};

module.exports = EmailChannelSchema;
