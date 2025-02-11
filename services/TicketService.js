const _ = require("lodash");
const moment = require('moment');
const Promise = require("bluebird");
const errors = require("../errors");
const TicketUtility = require('../db/utilities/TicketUtility');
const BaseService = require("./BaseService");
const TeamService = require("./TeamService");
const UserService = require("./UserService");
const CustomerService = require("./CustomerService");
const TagService = require("./TagService");
const TicketTypeService = require("./TicketTypeService");
const TicketEventPublisher = require("../Events/TicketEvent/TicketEventPublisher");
const { Status: TicketStatus } = require("../constants/TicketConstants");
const { UserType } = require("../constants/ClientConstants");


class TicketService extends BaseService {

    constructor(fields = null, dependencies = {}) {
        super();
        this.utilityInst = new TicketUtility();
        this.ConversationService = dependencies.ConversationService || null;
        this.CustomerService = CustomerService; //dependencies.CustomerService || null;
        this.entityName = 'Ticket';
        this.listingFields = ["id", "sno", "title", "description", "customerId", "status", "externalId", "language", "teamId", "typeId", "assigneeId", "trackingId", "lastMessage", "customerId", "createdAt", "tagIds", "chatbotId", "threadId", "assigneeTo", "-_id"];
        if (fields) {
            this.listingFields = fields;
        }
        // this.listingFields = [ "title", "description", "status", "sno", "externalId", "language", "teamId", "assigneeId", "clientId", "createdBy", "deletedAt", "-_id"];
        this.updatableFields = ["title", "description", "status", "customerId", "externalId", "priority", "language", "teamId", "assigneeId", "assigneeTo", "typeId", "summary", "qa", "reopen", "chatbotId", "threadId", "assigneeTo", "lastMailgunMessageId", "mailgunReferenceIds"];
    }

    async createTicket(ticketData) {
        try {
            let { title, description, typeId, clientId, workspaceId, sessionId, device, createdBy, customerId, ticketCreatedBy } = ticketData;
            let workspaceTicketCount = await this.count({ clientId, workspaceId });
            let sno = workspaceTicketCount + 1;
            let companyId = null;
            if (customerId) {
                let customerInst = new this.CustomerService();
                let customer = await customerInst.getDetails(customerId, workspaceId, clientId);
                if (customer.companyId) {
                    companyId = customer.companyId;
                }
            }
            ticketData.sno = sno;
            ticketData.companyId = companyId;
            let { id: ticket_id } = await this.create(ticketData)
                .catch(err => {
                    if (err instanceof errors.Conflict) {
                        return new errors.AlreadyExist("Ticket already exist.")
                    }
                    return Promise.reject(err);
                });
            let ticket = await this.findOrFail(ticket_id);
            let inst = new TicketEventPublisher();
            await inst.created(ticket);
            return _.pick(ticket, this.listingFields);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async listTickets(req) {
        let data = await this.paginate(req);

        let tickets = [];
        for (let i = 0; i < data.docs.length; i++) {
            let ticket = data.docs[i].toJSON();
            tickets.push(ticket);
        }
        tickets = await this.utilityInst.populate('team', tickets);
        tickets = await this.utilityInst.populate('type', tickets);
        tickets = await this.utilityInst.populate('customer', tickets);
        tickets = await this.utilityInst.populate('tags', tickets);
        tickets = await this.utilityInst.populate('topics', tickets);

        data.docs = tickets;
        return data
    }

    async getDetails(sno, workspaceId, clientId, populate = false) {
        try {
            let ticket = await this.findOne({ sno, workspaceId, clientId });
            if (_.isEmpty(ticket)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            if (!populate) {
                return ticket;
            }
            let tickets = await this.utilityInst.populate('team', [ticket]);
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
            let ticketEventPublisherInst = new TicketEventPublisher();
            let ticket = await this.getDetails(sno, workspaceId, clientId);
            if (updateValues.teamId) {
                let inst = new TeamService()
                let team = await inst.getDetails(updateValues.teamId, workspaceId, clientId);
            }
            if (updateValues.assigneeId) {
                let inst = new UserService()
                let agent = await inst.getDetails(updateValues.assigneeId, clientId);
                updateValues.assigneeTo = UserType.agent;
            }
            if (updateValues.customerId) {
                let inst = new CustomerService(null, { TagService })
                let customer = await inst.getDetails(updateValues.customerId, workspaceId, clientId);
            }
            if (updateValues.typeId) {
                let inst = new TicketTypeService()
                let ticketType = await inst.getDetails({ id: updateValues.typeId, workspaceId, clientId });
            }
            if (updateValues.status) {
                let ticketStatus = ticket.status.toLowerCase();
                let updatedStatus = updateValues.status.toLowerCase();
                if (ticketStatus == TicketStatus.closed) {
                    if (updatedStatus !== TicketStatus.closed) {
                        updateValues.reopen = {
                            count: 1,
                            lastAt: new Date(),
                        };
                        if (ticket.reopen) {
                            updateValues.reopen.count = ticket.reopen.count + 1;
                        }
                    }
                } else {
                    if (updatedStatus == TicketStatus.closed) {
                        updateValues.closedAt = new Date();
                        await ticketEventPublisherInst.closed(ticket);
                    }
                }
            }
            await this.update({ id: ticket.id }, updateValues);
            await ticketEventPublisherInst.updated(ticket, updateValues);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteTicket({ sno, workspaceId, clientId }) {
        try {
            let ticket = await this.getDetails(sno, workspaceId, clientId);
            let res = await this.softDelete(ticket.id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ status, teamId, typeId, assigneeId, customerId, companyId, priority, externalId, mentionId, tagId, topicId, sessionId, language, createdFrom, createdTo, workspaceId, clientId, }) {
        let filters = {}
        filters.clientId = clientId;
        filters.workspaceId = workspaceId;
        if (status) {
            filters.status = status;
        }
        if (typeId) {
            filters.typeId = typeId;
        }
        if (teamId) {
            filters.teamId = teamId;
        }
        if (companyId) {
            filters.companyId = companyId;
        }
        if (customerId) {
            filters.customerId = customerId;
        }
        if (externalId) {
            filters.externalId = externalId;
        }

        if (assigneeId) {
            filters.assigneeId = assigneeId;
            if (assigneeId.toLowerCase() == 'unassigned') {
                filters.assigneeId = null;
            }
        }
        if (priority) {
            filters.priority = priority;
        }

        if (tagId) {
            filters.tagIds = tagId;
        }
        if (mentionId) {
            filters.mentionIds = mentionId;
        }
        if (topicId) {
            filters.topicIds = topicId;
        }
        if (sessionId) {
            filters.sessionId = sessionId;
        }
        if (language) {
            filters.language = language;
        }

        if (createdFrom) {
            if (!moment(createdFrom, moment.ISO_8601, true).isValid()) {
                return Promise.reject(new errors.BadRequest("Invalid created from date format."));
            }
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$gte'] = new Date(createdFrom);
        }
        if (createdTo) {
            if (!moment(createdTo, moment.ISO_8601, true).isValid()) {
                return Promise.reject(new errors.BadRequest("Invalid created to date format."));
            }
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$lt'] = new Date(createdTo);
        }
        return filters;
    }

    async attachTagOrTopic({ sno, workspaceId, clientId }, entityType, entityId, action = 'add') {
        let ticket = await this.getDetails(sno, workspaceId, clientId);
        let toUpdate = {};

        let k1 = '$addToSet';
        if (action != 'add') {
            k1 = '$pull';
        }

        let k2 = 'tagIds';
        if (entityType != 'tag') {
            k2 = 'topicIds'
        }

        toUpdate[k1] = {};
        toUpdate[k1][k2] = entityId;

        await this.updateOne({ id: ticket.id }, toUpdate);
        return Promise.resolve();
    }

    async addMention(mentionId) {
        await this.update({ id: ticket.id }, { $addToSet: { mentionIds: mentionId } });
    }
}

module.exports = TicketService;
