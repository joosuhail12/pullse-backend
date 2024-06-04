const { v4: uuid } = require('uuid');

const ChatBotSchema = {
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
      required: true
    },
    status: {
      type: String,
      required: true
    },
    assistantId: {
      type: String,
      required: true
    },
    channels: [{
      type: String,
      required: true
    }],
    audience: [{
      type: String,
      required: true
    }],
    ruleIds: [{
      type: String,
    }],
    introMessages: [{
      type: String,
    }],
    answerMode: {
      type: String,
      enum: ["once", "loop"],
    },
    afterAnswer: {
      type: String,
      enum: ["close", "route"],
    },
    ifCantAnswer: {
      type: String,
      enum: ["close", "route"],
    },
    handoverMessages: [{
      type: String,
    }],
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
      type: Date
    }
  },
  schemaName: "chatbot",
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

module.exports = ChatBotSchema;
