const { v4: uuid } = require('uuid');

const TeamSchema = {
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
        description: {
            type: String,
        },
        workspaceId: {
            type: String,
            // required: true,
        },
        officeHours: {
            type: Map,
            of: {
                start: String,
                end: String
            },
            default: {}
        },
        assigningMethod: {
            type: String,
            enum: ['manual', 'round_robin', 'load_balanced'],
            default: 'manual'
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
    schemaName: "team",
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

module.exports = TeamSchema;
