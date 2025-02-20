const { v4: uuid } = require('uuid');

const CompanySchema = {
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
        phone: {
            type: String,
        },
        numberOfEmployees: {
            type: Number,
        },
        annualRevenue: {
            type: Number,
        },
        websites: [{
            type: String,
        }],
        notes: {
            type: String,
        },
        tagIds: [{
            type: String,
        }],
        accountTier: {
            type: String,
        },
        industry: {
            type: String,
        },
        address: {
            type: String,
        },
        city: {
            type: String,
        },
        state: {
            type: String,
        },
        zipcode: {
            type: String,
        },
        country: {
            type: String,
        },
        customFields: {
            type: Object,
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
    schemaName: "company",
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

module.exports = CompanySchema;
