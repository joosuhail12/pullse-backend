const { v4: uuid } = require('uuid');
const UserStatus = require('../../constants/UserStatus');
// const UserRoles = Object.freeze({
//     SUPER_ADMIN: "SUPER_ADMIN",
//     ORGANIZATION_ADMIN: "ORGANIZATION_ADMIN",
//     WORKSPACE_ADMIN: "WORKSPACE_ADMIN",
//     WORKSPACE_AGENT: "WORKSPACE_AGENT",
// });

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
        status: {
            type: String,
            default: UserStatus.active
        },
        defaultWorkspaceId: {
            type: String,
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



// role base user admin of workspace 
// another table 
// workspace
// role 