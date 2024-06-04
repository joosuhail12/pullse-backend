const { v4: uuid } = require('uuid');

const RolePermissionSchema = {
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
        group: {
            type: String,
            default: null
        },
        description: {
            type: String,
        },
        createdBy: {
            type: String, // id of user
            required: true,
        },
        deletedAt: {
            type: Date
        }
    },
    schemaName: "rolePermissions",
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

module.exports = RolePermissionSchema;
