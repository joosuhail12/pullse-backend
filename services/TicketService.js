const _ = require("lodash");
const moment = require('moment');
const Promise = require("bluebird");
const errors = require("../errors");
const TicketUtility = require('../db/utilities/TicketUtility');
const BaseService = require("./BaseService");
const TicketEventPublisher = require("../Events/TicketEvent/TicketEventPublisher");
const { Status: TicketStatus } = require("../constants/TicketConstants");
const { UserType } = require("../constants/ClientConstants");
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
class TicketService extends BaseService {
    constructor(fields = null, dependencies = {}) {
        super();
        this.utilityInst = new TicketUtility();
        this.ConversationService = dependencies.ConversationService || null;
        this.entityName = 'tickets';
        this.listingFields = [
            "id", "sno", "title", "description", "customerId", "status",
            "externalId", "language", "teamId", "typeId", "assigneeId", "trackingId",
            "lastMessage", "created_at", "tagIds", "chatbotId", "threadId", "assigneeTo"
        ];

        if (fields) {
            this.listingFields = fields;
        }

        this.updatableFields = [
            "title", "description", "status", "customerId", "externalId", "priority",
            "language", "teamId", "assigneeId", "assigneeTo", "typeId", "summary",
            "qa", "reopen", "chatbotId", "threadId"
        ];
    }

    async createTicket(ticketData) {
        try {
            let { clientId, workspaceId, customerId } = ticketData;

            let { count: workspaceTicketCount } = await supabase
                .from(this.entityName)
                .select('*', { count: 'exact', head: true })
                .match({ clientId, workspaceId });

            let sno = workspaceTicketCount + 1;
            let companyId = null;

            if (customerId) {
                const { default: CustomerService } = require("./CustomerService");
                let customerInst = new CustomerService();
                let customer = await customerInst.getDetails(customerId, workspaceId, clientId);
                if (customer?.companyId) {
                    companyId = customer.companyId;
                }
            }

            ticketData.sno = sno;
            ticketData.companyId = companyId;

            const { data, error } = await supabase
                .from(this.entityName)
                .insert(ticketData)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new errors.AlreadyExist("Ticket already exists.");
                }
                throw new errors.DBError(error.message);
            }

            let ticket = data;
            let inst = new TicketEventPublisher();
            await inst.created(ticket);

            return _.pick(ticket, this.listingFields);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async listTickets(req) {
        let data = await this.paginate(req);
        data.docs = await this.utilityInst.populate('team', data.docs);
        data.docs = await this.utilityInst.populate('type', data.docs);
        data.docs = await this.utilityInst.populate('customer', data.docs);
        data.docs = await this.utilityInst.populate('tags', data.docs);
        data.docs = await this.utilityInst.populate('topics', data.docs);

        return data;
    }

    async getDetails(sno, workspaceId, clientId, populate = false) {
        try {
            let { data: ticket, error } = await supabase
                .from(this.entityName)
                .select('*')
                .match({ sno, workspaceId, clientId })
                .single();

            if (error || !ticket) {
                throw new errors.NotFound(`${this.entityName} not found.`);
            }

            if (!populate) {
                return ticket;
            }

            let tickets = [ticket];
            tickets = await this.utilityInst.populate('team', tickets);
            tickets = await this.utilityInst.populate('type', tickets);
            tickets = await this.utilityInst.populate('customer', tickets);
            tickets = await this.utilityInst.populate('tags', tickets);
            tickets = await this.utilityInst.populate('topics', tickets);
            tickets = await this.utilityInst.populate('assignee', tickets);
            tickets = await this.utilityInst.populate('addedBy', tickets);

            return tickets[0];
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateTicket({ sno, workspaceId, clientId }, updateValues) {
        try {
            const { default: TeamService } = require("./TeamService");
            const { default: UserService } = require("./UserService");
            const { default: CustomerService } = require("./CustomerService");
            const { default: TicketTypeService } = require("./TicketTypeService");

            let ticketEventPublisherInst = new TicketEventPublisher();
            let ticket = await this.getDetails(sno, workspaceId, clientId);

            if (updateValues.teamId) {
                let inst = new TeamService();
                await inst.getDetails(updateValues.teamId, workspaceId, clientId);
            }
            if (updateValues.assigneeId) {
                let inst = new UserService();
                await inst.getDetails(updateValues.assigneeId, clientId);
                updateValues.assigneeTo = UserType.agent;
            }
            if (updateValues.customerId) {
                let inst = new CustomerService();
                await inst.getDetails(updateValues.customerId, workspaceId, clientId);
            }
            if (updateValues.typeId) {
                let inst = new TicketTypeService();
                await inst.getDetails({ id: updateValues.typeId, workspaceId, clientId });
            }

            if (updateValues.status) {
                if (ticket.status.toLowerCase() === TicketStatus.closed &&
                    updateValues.status.toLowerCase() !== TicketStatus.closed) {
                    updateValues.reopen = {
                        count: (ticket.reopen?.count || 0) + 1,
                        lastAt: new Date(),
                    };
                } else if (updateValues.status.toLowerCase() === TicketStatus.closed) {
                    updateValues.closedAt = new Date();
                    await ticketEventPublisherInst.closed(ticket);
                }
            }

            const { error } = await supabase
                .from(this.entityName)
                .update(updateValues)
                .match({ id: ticket.id });

            if (error) throw new errors.DBError(error.message);

            await ticketEventPublisherInst.updated(ticket, updateValues);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteTicket({ sno, workspaceId, clientId }) {
        try {
            let ticket = await this.getDetails(sno, workspaceId, clientId);
            const { error } = await supabase
                .from(this.entityName)
                .update({ deleted_at: new Date() })
                .match({ id: ticket.id });

            if (error) throw new errors.DBError(error.message);

            return { message: "Ticket soft deleted successfully." };
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = TicketService;
