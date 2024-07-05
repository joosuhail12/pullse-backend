const { v4: uuid } = require("uuid");
const { Schema, model } = require("mongoose");
const User = require("./UserSchema");
 
const WorkspaceSchema = {
  fields: {
    id: {
      type: String,
      required: true,
      index: true,
      default: function () {
        return uuid();
      },
    },
    workspace_alternate_id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    chatWidgetSecret: {
      type: String,
      required: true,
      default: function () {
        return uuid();
      },
    },
    chatbotSetting: {
      type: Object,
    },
    sentimentSetting: {
      type: Object,
    },
    qualityAssuranceSetting: {
      type: Object,
    },
    clientId: {
      type: String,
      required: true,
    },
    //
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
 
    // createdBy: {
    //   type: String, // id of user
    //   required: true,
    // },
    // creatorEmail: {
    //   type: String, // id of user
    //   // required: true,
    // },
    deletedAt: {
      type: Date,
    },
    users: {
      type: Number,
      default: 0,
    },
  },
  schemaName: "workspace",
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
 
module.exports = WorkspaceSchema;