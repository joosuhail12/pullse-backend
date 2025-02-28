const _ = require("lodash");
const Promise = require("bluebird");
const ConversationService = require("./ConversationService");
const errors = require("../errors");

class TicketConversationService extends ConversationService {
    constructor() {
        super();
        this.entityName = "Ticket Conversation";
    }
}

module.exports = TicketConversationService;
