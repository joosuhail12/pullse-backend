const { v4: uuid } = require("uuid");

const CustomerSchema = {
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
    email: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
    },
    workPhone: {
      type: String,
    },
    phone: {
      type: String,
    },
    phoneCountry: {
      type: String,
    },
    externalId: {
      type: String,
    },
    twitter: {
      type: String,
    },
    linkedin: {
      type: String,
    },
    timezone: {
      type: String,
    },
    language: {
      type: String,
    },
    address: {
      type: String,
    },
    about: {
      type: String,
    },
    notes: {
      type: String,
    },
    tagIds: [
      {
        type: String,
      },
    ],
    companyId: {
      type: String,
    },
    customFields: {
      type: Object,
    },
    sessions: [
      {
        id: {
          type: String,
        },
        issuedAt: {
          type: Date,
        },
        expiry: {
          type: Date,
        },
        userAgent: {
          type: String,
        },
        ip: {
          type: String,
          default: "NA",
        },
      },
    ],
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
    lastActiveAt: {
      type: String,
    },
    deletedAt: {
      type: Date,
    },
  },
  schemaName: "customers",
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

module.exports = CustomerSchema;
