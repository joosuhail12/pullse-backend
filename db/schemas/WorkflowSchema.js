const { v4: uuid } = require("uuid");

const WorkflowSchema = {
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
    summary: {
      type: String,
    },
    description: {
      type: String,
    },
    ruleIds: {
      type: [String],
      required: true,
    },
    operator: {
      type: String,
      enum: ["and", "or"],
      default: "and",
    },
    actionIds: {
      type: [String],
      // required: true,
    },
    position: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "outdated"],
      default: "active",
    },
    lastUpdatedBy: {
      type: String,
    },
    affectedTicketsCount: {
      type: Number,
      default: 0,
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
  schemaName: "workflow",
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

module.exports = WorkflowSchema;
