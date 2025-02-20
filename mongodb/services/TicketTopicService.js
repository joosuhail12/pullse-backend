const Promise = require("bluebird");
const errors = require("../../errors");
const TicketTopicUtility = require('../db/utilities/TicketTopicUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");

class TicketTopicService extends BaseService {

    constructor() {
        super();
        this.utilityInst = new TicketTopicUtility();
        this.entityName = 'Ticket Topic';
        this.listingFields = ["-_id"];
        this.updatableFields = [ "name", "description", "archiveAt"];
    }

    async createTicketTopic(data) {
        try {
            let { name, workspaceId, clientId } = data;
            let topic = await this.findOne({ name: { $regex : `^${name}$`, $options: "i" }, workspaceId, clientId });
            if (!_.isEmpty(topic)) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${name}" already exist.`));
            }
            return this.create(data);
        } catch(err) {
            return this.handleError(err);
        }
    }

    async updateTicketTopic(ticket_topic_id, updateValues) {
        try {
            await this.update({ id: ticket_topic_id }, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }

    async deleteTicketTopic(id) {
        try {
            let res = await this.softDelete(id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, archived, createdFrom, createdTo, clientId }) {
        let filters = {};
        filters.clientId = clientId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
        }

        if (archived) {
            filters.archiveAt = { $ne: null };
        }
        if (createdFrom) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$gte'] = createdFrom;
        }
        if (createdTo) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$lt'] = createdTo;
        }

        return filters;
    }
}

module.exports = TicketTopicService;
