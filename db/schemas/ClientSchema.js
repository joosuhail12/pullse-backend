const { v4: uuid } = require('uuid');

const ClientConstants = require('../../constants/ClientConstants');

module.exports = {
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
      default: ClientConstants.Status.ACTIVE
    },
    secret: {
      type: String,
      required: true,
      default: function() {
        return uuid()
      }
    },
    ownerId: {
      type: String, // id of user
    },
    createdBy: {
      type: String, // id of user
      required: true,
    },
    deletedAt: {
      type: Date
    }
  },
  schemaName: "clients",
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

