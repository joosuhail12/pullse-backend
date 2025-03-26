const _ = require("lodash");
const moment = require('moment');
const Promise = require("bluebird");
const errors = require("../errors");
const TicketUtility = require('../db/utilities/TicketUtility');
const TicketEventPublisher = require("../Events/TicketEvent/TicketEventPublisher");
const { Status: TicketStatus } = require("../constants/TicketConstants");
const { UserType } = require("../constants/ClientConstants");
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class TicketService {
    constructor(fields = null, dependencies = {}) {
        this.utilityInst = new TicketUtility({
            team: { table: 'teams', key: 'teamId' },
            type: { table: 'ticketTypes', key: 'typeId' },
            customer: { table: 'users', key: 'customerId' },
            tags: { table: 'tags', key: 'tagIds' },
            topics: { table: 'topics', key: 'topicIds' },
            assignee: { table: 'users', key: 'assigneeId' },
            addedBy: { table: 'users', key: 'createdBy' }
        });
        this.ConversationService = dependencies.ConversationService || null;
        this.entityName = 'tickets';
    }

    async createTicket(ticketData) {
        try {
            const { message, emailChannel, clientId, workspaceId, recipients, assignee, ...ticketUpdateData } = ticketData;

            const { count: workspaceTicketCount } = await supabase
                .from(this.entityName)
                .select('*', { count: 'exact', head: true })
                .match({ clientId, workspaceId });

            const sno = (workspaceTicketCount ?? 0) + 1;
            ticketUpdateData.sno = sno;
            ticketUpdateData.entityType = 'ticket';
            ticketUpdateData.unread = 1;
            ticketUpdateData.createdAt = new Date().toISOString();
            ticketUpdateData.updatedAt = new Date().toISOString();
            ticketUpdateData.priority = ticketUpdateData.priority === 'high' ? 2 : ticketUpdateData.priority === 'medium' ? 1 : 0;
            ticketUpdateData.lastMessageAt = new Date().toISOString();
            ticketUpdateData.title = ticketUpdateData.subject;
            ticketUpdateData.clientId = clientId;
            ticketUpdateData.workspaceId = workspaceId;
            ticketUpdateData.lastMessage = message;
            delete ticketUpdateData.subject;

            ticketUpdateData.lastMessageBy = ticketUpdateData.customerId;

            const { data: insertedTicket, error } = await supabase
                .from(this.entityName)
                .insert(ticketUpdateData)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new errors.AlreadyExist("Ticket already exists.");
                }
                throw new errors.DBError(error.message);
            }

            const ticketId = insertedTicket.id;

            if (recipients && recipients.length > 0) {
                await Promise.map(recipients, async (recipient) => {
                    await supabase.from('ticketMentions').insert({ ticketId, userId: recipient.id });
                    await supabase.from('ticketCustomers').insert({ ticketId, customerId: recipient.id });
                });
            }

            if (assignee?.id) {
                await supabase.from('ticketAssignees').insert({ ticketId, userId: assignee.id });
            }

            const inst = new TicketEventPublisher();
            await inst.created(insertedTicket);

            const customer = recipients[0];
            const tags = ticketUpdateData.tagIds || [];

            return {
                id: insertedTicket.id,
                subject: insertedTicket.title,
                customer: `${customer.firstname} ${customer.lastname}` || customer.email,
                lastMessage: insertedTicket.lastMessage,
                assignee: assignee?.name || null,
                company: customer.company?.name || null,
                tags,
                status: insertedTicket.status,
                priority: ticketData.priority,
                createdAt: insertedTicket.createdAt,
                isUnread: Boolean(insertedTicket.unread),
                hasNotification: false,
                notificationType: null,
                recipients: recipients.map((r) => r.email)
            };
        } catch (err) {
            console.log(err, "err---");
            throw err;
        }
    }

    async listTickets(req) {
        try {
            const { data: tickets, error } = await supabase
                .from(this.entityName)
                .select('*')
                .match({ workspaceId: req.workspaceId, clientId: req.clientId });

            if (error) {
                throw new errors.DBError(error.message);
            }

            const enrichedTickets = await Promise.map(tickets, async (ticket) => {
                const { data: customers } = await supabase.from('ticketCustomers').select('customerId, users(email, firstname, lastname, company(name))').eq('ticketId', ticket.id);
                const { data: assignees } = await supabase.from('ticketAssignees').select('userId, users(name)').eq('ticketId', ticket.id);
                const { data: mentions } = await supabase.from('ticketMentions').select('userId, users(email)').eq('ticketId', ticket.id);
                const { data: companies } = await supabase.from('ticketCompanies').select('companyId, companies(name)').eq('ticketId', ticket.id);

                const primaryCustomer = customers?.[0]?.users;
                const primaryCompany = companies?.[0]?.companies;
                const recipientEmails = mentions?.map(m => m.users?.email).filter(Boolean) || [];

                return {
                    id: ticket.id,
                    subject: ticket.title,
                    customer: `${primaryCustomer?.firstname} ${primaryCustomer?.lastname}` || primaryCustomer?.email,
                    lastMessage: ticket.lastMessage,
                    assignee: assignees?.[0]?.users?.name || null,
                    company: primaryCompany?.name || null,
                    tags: ticket.tags || [],
                    status: ticket.status,
                    priority: ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low',
                    createdAt: ticket.createdAt,
                    isUnread: Boolean(ticket.unread),
                    hasNotification: false,
                    notificationType: null,
                    recipients: recipientEmails
                };
            });

            return { docs: enrichedTickets };
        } catch (err) {
            console.log(err, "err---");
            throw err;
        }
    }
}

module.exports = TicketService;
