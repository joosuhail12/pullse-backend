const BaseUtility = require("./BaseUtility");
const TagUtility = require("./TagUtility");
const TeamUtility = require("./TeamUtility");
const CustomerUtility = require("./CustomerUtility");
const TicketTypeUtility = require("./TicketTypeUtility");
const TicketTopicUtility = require("./TicketTopicUtility");
const ClientUtility = require("./ClientUtility");
const UserUtility = require("./UserUtility");

class TicketUtility extends BaseUtility {
  constructor() {
    super("tickets"); // Supabase table name

    this.populateFields = {
      type: {
        multiple: false,
        utility: new TicketTypeUtility(),
        field: "typeId",
      },
      team: {
        multiple: false,
        utility: new TeamUtility(),
        field: "teamId",
      },
      customer: {
        multiple: false,
        utility: new CustomerUtility(),
        field: "customerId",
      },
      assignee: {
        multiple: false,
        utility: new UserUtility(),
        field: "assigneeId",
      },
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: "clientId",
      },
      added_by: {
        multiple: false,
        utility: new UserUtility(),
        field: "createdBy",
      },
      tags: {
        multiple: true,
        utility: new TagUtility(),
        field: "tagIds",
      },
      mentions: {
        multiple: true,
        utility: new UserUtility(),
        field: "mentionIds",
      },
      topics: {
        multiple: true,
        utility: new TicketTopicUtility(),
        field: "topicIds",
      },
    };
  }
}

module.exports = TicketUtility;
