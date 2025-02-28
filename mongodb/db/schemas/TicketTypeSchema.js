const { v4: uuid } = require('uuid');

const TicketTypeSchema = {
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
            enum: ["customer", "back-office", "tracker"]
        },
        customerSharing: {
            type: String,
            enum: ["NA", "available"],
            default: "NA"
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
    schemaName: "ticketType",
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

module.exports = TicketTypeSchema;
