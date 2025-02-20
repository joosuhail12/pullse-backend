const Promise = require("bluebird");
const errors = require("../../errors");
const TicketTypeUtility = require('../db/utilities/TicketTypeUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");

class TicketTypeService extends BaseService {

    constructor(fields=null) {
        super();
        this.utilityInst = new TicketTypeUtility();
        this.entityName = 'Ticket Type';
        this.listingFields = ["-_id"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = [ "name", "description", "type", "customerSharing", ];
    }

    async createTicketType(data) {
        try {
            let { name, workspaceId, clientId } = data;
            let ticketType = await this.findOne({ name: { $regex : `^${name}$`, $options: "i" }, workspaceId, clientId });
            if (!_.isEmpty(ticketType)) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${name}" already exist.`));
            }
            return this.create(data);
        } catch(err) {
            return this.handleError(err);
        }
    }

    async updateTicketType({ id, workspaceId, clientId }, updateValues) {
        try {
            let ticketType = await this.getDetails({ id, workspaceId, clientId });
            await this.update({ id: ticketType.id }, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }

    async deleteTicketType(id, workspaceId, clientId) {
        try {
            let ticketType = await this.getDetails({ id, workspaceId, clientId });
            let res = await this.softDelete(ticketType.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, type, archived, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = {};
        filters.clientId = clientId;
        filters.workspaceId = workspaceId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
        }

        if (type) {
            filters.type = type;
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

module.exports = TicketTypeService;
