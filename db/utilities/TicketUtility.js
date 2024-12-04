const _ = require("lodash");
const TicketSchema = require("../schemas/TicketSchema");
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
        super(TicketSchema);
        this.populateFields = {
            type: {
                multiple: false,
                utility: new TicketTypeUtility(),
                field: 'typeId',
                getFields: {'id': 1, 'name': 1, "_id": 0 }
            },
            team: {
                multiple: false,
                utility: new TeamUtility(),
                field: 'teamId',
                getFields: {'id': 1, 'name': 1, "_id": 0 }
            },
            customer: {
                multiple: false,
                utility: new CustomerUtility(),
                field: 'customerId',
                getFields: []
            },
            assignee: {
                multiple: false,
                utility: new UserUtility(),
                field: 'assigneeId',
                getFields: {'id': 1, 'name': 1, "_id": 0 }
            },
            client: {
                multiple: false,
                utility: new ClientUtility(),
                field: 'clientId',
                getFields: {'id': 1, 'name': 1, "_id": 0 }
            },
            addedBy: {
                multiple: false,
                utility: new UserUtility(),
                field: 'createdBy',
                getFields: {'id': 1, 'name': 1, "_id": 0 }
            },
            tags: {
                multiple: true,
                utility: new TagUtility(),
                field: 'tagIds',
                getFields: {'id': 1, 'name': 1, "_id": 0 }
            },
            mentions: {
                multiple: true,
                utility: new UserUtility(),
                field: 'mentionIds',
                getFields: {'id': 1, 'name': 1, "_id": 0 }
            },
            topics: {
                multiple: true,
                utility: new TicketTopicUtility(),
                field: 'topicIds',
                getFields: {'id': 1, 'name': 1, "_id": 0 }
            },
        };
    }
}

module.exports = TicketUtility;
