const { v4: uuid } = require("uuid");

const WorkflowActionSchema = {
  fields: {
    id: {
      type: String,
      required: true,
      index: true,
      default: function () {
        return uuid();
      },
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    summary: {
      type: String,
    },
    position: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    attributes: {
      type: Object,
    },
    customAttributes: {
      type: Object,
    },
    fieldName: {
      type: String,
    },
    fieldValue: {
      type: String,
    },
    additionalData: {
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
      type: Date,
    },
  },
  schemaName: "workflowAction",
  options: {
    timestamps: true,
  },
  indexes: [
    {
      fields: { id: 1, deletedAt: 1 },
      options: { unique: true },
    },
  ],
};

module.exports = WorkflowActionSchema;
