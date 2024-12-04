const { v4: uuid } = require('uuid');

const ChatBotDocumentSchema = {
  fields: {
    id: {
      type: String,
      required: true,
      index: true,
      default: function() {
        return uuid()
      }
    },
    title: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    status: {
      type: String,
    },
    link: {
      type: String,
    },
    filePath: {
      type: String,
    },
    fileMD5: {
      type: String,
    },
    chatbotIds: [{
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
  schemaName: "chatbotDocument",
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

module.exports = ChatBotDocumentSchema;
