const { v4: uuid } = require('uuid');

const WorkspaceSchema = {
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
        status:{
            type: Boolean,
           default:true
        },
        description: {
            type: String,
        },
        clientId: {
            type: String,
            required: true,
        },
        createdBy: {
            type: String, // 
            
            required: true,
        },
        deletedAt: {
            type: Date
        }
    },
    schemaName: "workspace",
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

module.exports = WorkspaceSchema;
