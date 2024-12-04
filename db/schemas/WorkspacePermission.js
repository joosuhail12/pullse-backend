const { v4: uuid } = require('uuid');

const WorkspacePermissionSchema = {
    fields: {
        id: {
            type: String,
            required: true,
            index: true,
            default: function() {
                return uuid();
            }
        },
        userId:{
            type: String,
            required: true, // ID of the user to whom this permission applies
        },
        clientId: {
            type: String,
            required: true, // ID of the user to whom this permission applies
        },
        workspaceId: {
            type: String,
            required: true, // ID of the workspace the permission is tied to
        },
        access:{
            type:Boolean,
            default:true
        },
        role: {
            type: String,
            required: true,
            enum: ["ORGANIZATION_ADMIN", "WORKSPACE_ADMIN", "WORKSPACE_AGENT"], // Role types as an enum
        },
        createdBy: {
            type: String, // ID of the user who created this permission record
            required: true,
        },
        deletedAt: {
            type: Date, // Soft delete field to mark a permission as removed without deleting
        },
    },
    schemaName: "workspacePermission",
    options: {
        timestamps: true, // Automatically create createdAt and updatedAt timestamps
    },
    indexes: [
        {
            fields: { id: 1, deletedAt: 1 },
            options: { unique: true },
        },
    ],
};

module.exports = WorkspacePermissionSchema;
