const _ = require("lodash");
const Promise = require("bluebird");
const errors = require("../errors");
const TicketUtility = require("../db/utilities/TicketUtility");
const BaseService = require("./BaseService");

class TicketService extends BaseService {
    constructor(fields = null, dependencies = {}) {
        super();
        this.utilityInst = new TicketUtility();
        this.entityName = "Ticket";
        this.listingFields = ["id", "sno", "title", "description", "customerId", "status", "createdAt"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = ["title", "description", "status", "customerId", "assigneeId", "priority"];
    }

    async createTicket(ticketData) {
        try {
            return this.create(ticketData);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let ticket = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(ticket)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }
            return ticket;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateTicket({ id, workspaceId, clientId }, updateValues) {
        try {
            let ticket = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: ticket.id }, updateValues);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteTicket({ id, workspaceId, clientId }) {
        try {
            let ticket = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(ticket.id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ title, status, assigneeId, customerId, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = { clientId, workspaceId };

        if (title) {
            filters.title = { $ilike: `%${title}%` };
        }
        if (status) {
            filters.status = status;
        }
        if (assigneeId) {
            filters.assigneeId = assigneeId;
        }
        if (customerId) {
            filters.customerId = customerId;
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

module.exports = TicketService;
