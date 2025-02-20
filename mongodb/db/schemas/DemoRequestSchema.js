
const { v4: uuid } = require('uuid');

const DemoRequestSchema = {
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
        email: {
            type: String,
            required: true,
        },
        count: {
          type: String,
          required: true,
        },
        description: {
            type: String,
        },
        status: {
          type: String,
          default: "pending"
        },
        deletedAt: {
            type: Date
        }
    },
    schemaName: "demoRequest",
    options: {
        timestamps: true
    },
    indexes: [
        {
            fields: { id: 1, deletedAt: 1},
            options: { unique: true }
        },
        {
            fields: { email: 1, deletedAt: 1},
            options: { unique: true }
        }
    ]
};

module.exports = DemoRequestSchema;
