const Promise = require("bluebird");
const errors = require("../errors");
const TicketTypeUtility = require('../db/utilities/TicketTypeUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");

class TicketTypeService extends BaseService {

    constructor(fields = null) {
        super();
        this.utilityInst = new TicketTypeUtility();
        this.entityName = 'tickettype';
        this.listingFields = ["id", "name", "description", "type", "customerSharing"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = ["name", "description", "type", "customerSharing"];
    }

    async createTicketType(data) {
        try {
            let { name, workspaceId, clientId } = data;
            let ticketType = await this.findOne({ name: { $ilike: `%${name}%` }, workspaceId, clientId });
            if (!_.isEmpty(ticketType)) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${name}" already exists.`));
            }
            return this.create(data);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let ticketType = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(ticketType)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }
            return ticketType;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateTicketType({ id, workspaceId, clientId }, updateValues) {
        try {
            let ticketType = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: ticketType.id }, updateValues);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteTicketType(id, workspaceId, clientId) {
        try {
            let ticketType = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(ticketType.id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, type, archived, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = { workspaceId, clientId };

        if (name) {
            filters.name = { $ilike: `%${name}%` };
        }

        if (type) {
            filters.type = type;
        }

        if (archived) {
            filters.archiveAt = { $ne: null };
        }

        if (createdFrom) {
            filters.createdAt = { $gte: createdFrom };
        }
        if (createdTo) {
            filters.createdAt = { ...filters.createdAt, $lte: createdTo };
        }

        return filters;
    }
}

module.exports = TicketTypeService;
