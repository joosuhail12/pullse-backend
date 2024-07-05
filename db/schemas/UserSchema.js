const { v4: uuid } = require('uuid');
const UserStatus = require('../../constants/UserStatus');

const UserSchema = {
    fields: {
        id: {
            type: String,
            required: true,
            index: true,
            default: function() {
                return uuid()
            }
        },
        fName: {
            type: String,
            required: true
        },
        lName: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        password: {
            required: true,
            type: String,
        },
        roleIds: [
            {
                type: String,
               // required: true
            },
        ],
        status: {
            type: String,
            default: UserStatus.active
        },
        defaultWorkspaceId: {
            type: String,
            required: true,
            default: "c15b5f69-c5f9-4378-a0e9-7230acf3742a"
        },
        teamId: {
            type: String,
        },
        clientId: {
            type: String,
        },
        accessTokens: [{
            name: {
                type: String,
            },
            token: {
                type: String,
            },
            issuedAt: {
                type: Date
            },
            expiry: {
                type: Date
            },
            userAgent: {
                type: String,
                default: "Unknown"
            },
            ip: {
                type: String,
                default: "NA"
            }
        }],
        lastLoggedInAt: {
            type: Date,
        },
        createdBy: {
            type: String, // id of user
            required: true,
        },
        deletedAt: {
            type: Date
        }
    },

    schemaName: "users",

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
        },
    ]
};

module.exports = UserSchema;
