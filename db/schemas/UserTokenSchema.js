const { v4: uuid } = require('uuid');

const UserTokenSchema = {
    fields: {
        id: {
            type: String,
            required: true,
            index: true,
            default: function() {
                return uuid()
            }
        },
        type: {
            type: String,
            required: true,
            enum: ["passwordReset", "emailVerification"]
        },
        token: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            default: new Date(Date.now() + (3 * 60 * 60 * 1000)) // pick number of hours(3) from config
        },
        userId: {
            type: String,
            required: true,
        },
        clientId: {
            type: String,
            required: true,
        },
        usedAt: {
            type: Date
        },
        deletedAt: {
            type: Date
        }
    },
    schemaName: "userToken",
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

module.exports = UserTokenSchema;
