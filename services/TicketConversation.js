const _ = require("lodash");
const Promise = require("bluebird");
const ConversationService = require("./ConversationService");
const errors = require("../errors");
const AuthType = require('../constants/AuthType');
const DecisionEngine = require('../DecisionEngine');

class TicketConversationService extends ConversationService {

    constructor() {
        super();
        this.entityName = "Ticket Conversation";
    }

};

module.exports = TicketConversationService;
