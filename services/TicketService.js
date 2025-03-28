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
                const { data: customers } = await supabase
                    .from('ticketCustomers')
                    .select(`
                        customerId, 
                        users(
                            id, 
                            email, 
                            firstname, 
                            lastname, 
                            phone,
                            type,
                            title,
                            department,
                            company(id, name)
                        )
                    `)
                    .eq('ticketId', ticket.id);

                const { data: assignees } = await supabase
                    .from('ticketAssignees')
                    .select('userId, users(id, name, email, role)')
                    .eq('ticketId', ticket.id);

                const { data: mentions } = await supabase
                    .from('ticketMentions')
                    .select('userId, users(id, email, name)')
                    .eq('ticketId', ticket.id);

                const { data: companies } = await supabase
                    .from('ticketCompanies')
                    .select('companyId, companies(id, name, domain)')
                    .eq('ticketId', ticket.id);

                const { data: tagData } = await supabase
                    .from('tags')
                    .select('id, name, color')
                    .in('id', ticket.tagIds || []);

                const { count: messageCount } = await supabase
                    .from('conversations')
                    .select('*', { count: 'exact', head: true })
                    .match({ ticket_id: ticket.id });

                const primaryCustomer = customers?.[0]?.users;
                const primaryCompany = companies?.[0]?.companies ||
                    (primaryCustomer?.company ? primaryCustomer.company : null);
                const recipientEmails = mentions?.map(m => m.users?.email).filter(Boolean) || [];
                const formattedTags = tagData?.map(tag => ({
                    id: tag.id,
                    name: tag.name,
                    color: tag.color
                })) || [];

                return {
                    id: ticket.id,
                    sno: ticket.sno,
                    subject: ticket.title,
                    description: ticket.description,

                    status: ticket.status,
                    statusType: ticket.statusId,
                    priority: ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low',
                    priorityRaw: ticket.priority,

                    customerId: ticket.customerId,
                    customer: {
                        id: primaryCustomer?.id,
                        name: `${primaryCustomer?.firstname || ''} ${primaryCustomer?.lastname || ''}`.trim() || primaryCustomer?.email,
                        email: primaryCustomer?.email,
                        phone: primaryCustomer?.phone,
                        type: primaryCustomer?.type,
                        title: primaryCustomer?.title,
                        department: primaryCustomer?.department
                    },

                    companyId: ticket.companyId,
                    company: primaryCompany ? {
                        id: primaryCompany.id,
                        name: primaryCompany.name,
                        domain: primaryCompany.domain
                    } : null,

                    assigneeId: ticket.assigneeId,
                    assignee: assignees?.[0]?.users ? {
                        id: assignees[0].users.id,
                        name: assignees[0].users.name,
                        email: assignees[0].users.email,
                        role: assignees[0].users.role
                    } : null,

                    teamId: ticket.teamId,

                    lastMessage: ticket.lastMessage,
                    lastMessageAt: ticket.lastMessageAt,
                    lastMessageBy: ticket.lastMessageBy,
                    messageCount: messageCount || 0,

                    channel: ticket.channel,
                    device: ticket.device,
                    tags: formattedTags,
                    intents: ticket.intents,
                    sentiment: ticket.sentiment,

                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,
                    closedAt: ticket.closedAt,

                    isUnread: Boolean(ticket.unread),
                    hasNotification: false,
                    notificationType: null,
                    recipients: recipientEmails,

                    summary: ticket.summary,
                    threadId: ticket.threadId,
                    externalId: ticket.externalId,

                    customFields: ticket.customFields || {},
                    topicIds: ticket.topicIds || [],
                    mentionIds: ticket.mentionIds || [],
                    reopenInfo: ticket.reopen || null
                };
            });

            return {
                docs: enrichedTickets,
                total: tickets.length,
                page: parseInt(req.page) || 1,
                limit: parseInt(req.limit) || 20,
                hasMore: false
            };
        } catch (err) {
            console.log(err, "err---");
            throw err;
        }
    }
}

module.exports = TicketService;
