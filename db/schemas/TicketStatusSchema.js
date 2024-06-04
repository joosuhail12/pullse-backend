const { v4: uuid } = require('uuid');
const { Status } = require('../../constants/TicketConstants');

const TicketStatusSchema = {
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
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: [ Status.pending, Status.inProgress, Status.closed, ]
        },
        description: {
            type: String,
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
    schemaName: "ticketStatus",
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

module.exports = TicketStatusSchema;
