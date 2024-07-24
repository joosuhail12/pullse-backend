const { v4: uuid } = require("uuid");

const TeamSchema = {
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
    workspaceId: {
      type: String,
    //   required: true,
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
    officeHoursStart: {
      type: [String], // Array of 7 values for start times
    //   validate: {
    //     validator: function (v) {
    //       return v.length === 7;
    //     },
    //     message: (props) => `${props.value} does not have 7 values!`,
    //   },
    },
    officeHoursEnd: {
      type: [String], // Array of 7 values for end times
    //   validate: {
    //     validator: function (v) {
    //       return v.length === 7;
    //     },
    //     message: (props) => `${props.value} does not have 7 values!`,
    //   },
    },
    holidays: {
      type: [Date], // Array to store holidays
    },
    assigning_method: {
      type: String,
      enum: ["manual", "automatic", "roundrobin"], // Assuming these are the possible values
      default: "manual",
    },
  },
  schemaName: "team",
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

module.exports = TeamSchema;
