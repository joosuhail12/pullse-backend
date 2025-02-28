const { v4: uuid } = require("uuid");

const WorkflowRuleSchema = {
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
    matchType: {
      type: String,
      required: true,
      enum: ["all", "any"],
    },
  //   $and: [
  //     { x: { $ne: 0 } },
  //     { $expr: { $eq: [ { $divide: [ 1, "$x" ] }, 3 ] } }
  //  ]
    properties: [{
      resource: {
        type: String,
      },
      field: {
        type: String,
      },
      operator: {
        type: String,
      },
      value: {
        type: Array
      },
    }],
    // type: {
    //   type: String,
    //   required: true,
    // },
    // fieldName: {
    //   type: String,
    // },
    // fieldValue: {
    //   type: String,
    // },
    // additionalData: {
    //   type: Object,
    // },
    position: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "outdated"],
      default: "active",
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
  schemaName: "workflowRule",
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

module.exports = WorkflowRuleSchema;
