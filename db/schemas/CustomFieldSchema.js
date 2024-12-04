const { v4: uuid } = require('uuid');

const CustomFieldSchema = {
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
        fieldType: {
            type: String, // text, number, date, select, checkbox, radio, textarea, multiselect
            required: true,
        },
        placeholder: {
            type: String,
        },
        defaultValue: {
            type: String,
        },
        options: [{
            type: String,
        }],
        isRequired: {
            type: Boolean,
            default: false,
        },
        visibleTo: [{
            type: String, // customer, agents, admins
            required: true,
        }],
        entityType: {
            type: String, // customer, company, ticket, custom entity
            required: true,
        },
        entityId: {
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
    schemaName: "customField",
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

module.exports = CustomFieldSchema;
