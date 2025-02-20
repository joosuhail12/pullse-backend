const { v4: uuid } = require('uuid');

const ReportSchema = {
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
        charts: [{
            title: {
                type: String,
            },
            color: {
                type: String,
            },
            type: {
                type: String,
            },
            columns: {
                type: Number,
                default: 6
            },
            entity: {
                type: String,
            },
            entityField: {
                type: String,
                name: String,
                valueText: { type: Object },
                valueColor: { type: Object}
            },
            conditions: {
                type: Object
            },
            labels: { type: Object },
            data: { type: Object },
        }],
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
    schemaName: "report",
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

module.exports = ReportSchema;
