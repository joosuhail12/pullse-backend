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
    super("ticket"); // Supabase table name

    this.populateFields = {
      type: {
        multiple: false,
        utility: new TicketTypeUtility(),
        field: "type_id",
      },
      team: {
        multiple: false,
        utility: new TeamUtility(),
        field: "team_id",
      },
      customer: {
        multiple: false,
        utility: new CustomerUtility(),
        field: "customer_id",
      },
      assignee: {
        multiple: false,
        utility: new UserUtility(),
        field: "assignee_id",
      },
      client: {
        multiple: false,
        utility: new ClientUtility(),
        field: "client_id",
      },
      added_by: {
        multiple: false,
        utility: new UserUtility(),
        field: "created_by",
      },
      tags: {
        multiple: true,
        utility: new TagUtility(),
        field: "tag_ids",
      },
      mentions: {
        multiple: true,
        utility: new UserUtility(),
        field: "mention_ids",
      },
      topics: {
        multiple: true,
        utility: new TicketTopicUtility(),
        field: "topic_ids",
      },
    };
  }
}

module.exports = TicketUtility;
