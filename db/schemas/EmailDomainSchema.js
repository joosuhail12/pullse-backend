const { v4: uuid } = require('uuid');

const EmailDomainSchema = {
    fields: {
        id: {
            type: String,
            required: true,
            index: true,
            default: function() {
                return uuid();
            }
        },
        EmailDomain: {
            type: String,
            required: true,
        },
        senderName: {
            type: String,
            required: true,
        },
        fromEmail: {
            type: String,
            required: true,
        },
        checkboxDefault: {
            type: Boolean,
            required: true,
            default: false,
        },
        ReplytoEmail: {
            type: String,
            required: true,
        },
        DKIM: {
            type: Boolean,
            required: true,
            default: false,
        },
        workspaceId: {
            type: String,
            required: true,
        },
        clientId: {
            type: String,
            required: true,
        },
        createdBy: {
            type: String, // id of user
            required: true,
        },
        deletedAt: {
            type: Date,
        },
    },
    schemaName: "emailDomain",
    options: {
        timestamps: true,
    },
    indexes: [
        {
            fields: { id: 1, deletedAt: 1 },
            options: { unique: true },
        },
    ],
};

module.exports = EmailDomainSchema;
