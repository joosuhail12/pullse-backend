const Promise = require("bluebird");
const errors = require("../errors");
const TicketStatusUtility = require('../db/utilities/TicketStatusUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");

class TicketStatusService extends BaseService {

    constructor() {
        super();
        this.utilityInst = new TicketStatusUtility();
        this.entityName = 'TicketStatus';
        this.listingFields = ["id", "name", "type"];
        this.updatableFields = ["name", "type", "description", "archived"];
    }

    async createTicketStatus(ticketStatusData) {
        try {
            let { name, clientId, workspaceId } = ticketStatusData;
            let ticketStatus = await this.findOne({ name: { $ilike: `%${name}%` }, clientId, workspaceId });
            if (!_.isEmpty(ticketStatus)) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} already exists.`));
            }
            return this.create(ticketStatusData);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let ticketStatus = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(ticketStatus)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }
            return ticketStatus;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateTicketStatus({ id, workspaceId, clientId }, updateValues) {
        try {
            let ticketStatus = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: ticketStatus.id }, updateValues);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteTicketStatus({ id, workspaceId, clientId }) {
        try {
            let ticketStatus = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(ticketStatus.id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, archived, workspaceId, clientId }) {
        let filters = { workspaceId, clientId };

        if (name) {
            filters.name = { $ilike: `%${name}%` };
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

module.exports = TicketStatusService;
