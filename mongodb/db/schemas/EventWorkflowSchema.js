const { v4: uuid } = require('uuid');

const EventWorkflowSchema = {
    fields: {
        id: {
            type: String,
            required: true,
            index: true,
            default: function() {
                return uuid()
            }
        },
        name: {
            type: String,
        },
        description: {
            type: String,
        },
        eventId: {
            type: String,
            required: true,
        },
        workflowId: {
            type: String,
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
        createdBy: {
            type: String, // id of user
            required: true,
        },
        deletedAt: {
            type: Date
        }
    },
    schemaName: "eventWorkflow",
    options: {
        timestamps: true
    },
    indexes: [
        {
            fields: { id: 1, deletedAt: 1},
            options: { unique: true }
        },
        {
            fields: { eventId: 1, workflowId: 1, deletedAt: 1 },
            options: { unique: true }
        }
    ]
};

module.exports = EventWorkflowSchema;
