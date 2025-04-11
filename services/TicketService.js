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
            const {
                message,
                emailChannel,
                clientId,
                workspaceId,
                recipients,
                assignee,
                ...ticketUpdateData
            } = ticketData;

            // 1. Get ticket serial number for the workspace
            const { count: workspaceTicketCount } = await supabase
                .from(this.entityName)
                .select('*', { count: 'exact', head: true })
                .match({ clientId, workspaceId });

            const sno = (workspaceTicketCount ?? 0) + 1;

            // 2. Prepare the ticket data
            const now = new Date().toISOString();
            const priorityMap = { high: 2, medium: 1, low: 0 };
            const customerId = ticketUpdateData.customerId;
            const tags = ticketUpdateData.tagIds || [];

            const ticketPayload = {
                ...ticketUpdateData,
                sno,
                entityType: 'ticket',
                unread: 1,
                createdAt: now,
                updatedAt: now,
                lastMessageAt: now,
                priority: priorityMap[ticketUpdateData.priority] ?? 0,
                title: ticketUpdateData.subject,
                clientId,
                workspaceId,
                lastMessage: message,
                lastMessageBy: customerId,
            };
            delete ticketPayload.subject;

            // Step 3: Lookup team for the channel (e.g., emailChannel)
            let assignedTeamId = null;
            if (emailChannel) {
                const { data: teamMapping, error: teamError } = await supabase
                    .from('teamChannels')
                    .select('teamId, channels(name)')
                    .eq('channels.name', emailChannel)
                    .maybeSingle();


                if (teamError) {
                    console.warn('Team mapping lookup failed', teamError);
                } else if (teamMapping?.teamId) {
                    assignedTeamId = teamMapping.teamId;
                }
            }

            // 4. Insert the main ticket
            const { data: insertedTicket, error: insertError } = await supabase
                .from(this.entityName)
                .insert(ticketPayload)
                .select()
                .single();

            if (insertError) {
                if (insertError.code === '23505') {
                    throw new errors.AlreadyExist("Ticket already exists.");
                }
                throw new errors.DBError(insertError.message);
            }

            const ticketId = insertedTicket.id;

            // 5. Insert mentions & customers
            if (recipients && recipients.length > 0) {
                await Promise.map(recipients, async (recipient) => {
                    await supabase.from('ticketMentions').insert({ ticketId, userId: recipient.id });
                    await supabase.from('ticketCustomers').insert({ ticketId, customerId: recipient.id });
                });
            }

            // 6. Insert assignee
            if (assignee?.id) {
                await supabase.from('ticketAssignees').insert({ ticketId, userId: assignee.id });
            }

            // 7. Publish event
            const eventPublisher = new TicketEventPublisher();
            console.log("insertedTicket", insertedTicket);
            await eventPublisher.created(insertedTicket);

            // 8. Prepare response
            const customer = recipients?.[0];
            return {
                id: ticketId,
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
                recipients: recipients.map(r => r.email)
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

                // Fetch ticket type data if typeId exists
                const ticketTypePromise = ticket.typeId
                    ? supabase.from('ticketTypes').select('id, name, type').eq('id', ticket.typeId)
                    : Promise.resolve({ data: null });

                const { data: ticketType } = await ticketTypePromise;

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
                    assigneeStatus: assignees?.[0]?.users ? 'Assigned' : 'Unassigned',

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

                    // Add language field
                    language: ticket.language || 'en',

                    // Add type information
                    type: ticketType?.[0]?.type || 'general',
                    typeName: ticketType?.[0]?.name || 'General',

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

    async updateTicket(ticketIdentifier, updateData) {
        try {
            const { sno, workspaceId, clientId } = ticketIdentifier;
            const { message, recipients, assignee, lastMessageBy, ...ticketUpdateData } = updateData;
            // Format priority
            if (typeof ticketUpdateData.priority === 'string') {
                const priorityMap = { high: 2, medium: 1, low: 0 };
                ticketUpdateData.priority = priorityMap[ticketUpdateData.priority] ?? 0;
            }

            // Map subject to title
            if (ticketUpdateData.subject) {
                ticketUpdateData.title = ticketUpdateData.subject;
                delete ticketUpdateData.subject;
            }

            ticketUpdateData.updatedAt = new Date().toISOString();

            // Fetch ticket
            let query = supabase.from(this.entityName).select('*');
            if (sno) query = query.eq('id', sno);
            else throw new errors.ValidationFailed("Either id or sno is required to update a ticket");
            query = query.eq('workspaceId', workspaceId).eq('clientId', clientId);

            const { data: existingTicket, error: fetchError } = await query.single();
            if (fetchError || !existingTicket) throw new errors.NotFound("Ticket not found");

            const previousAssigneeId = existingTicket.assigneeId;

            // Handle status transitions
            if (ticketUpdateData.status === 'closed' && existingTicket.status !== 'closed') {
                ticketUpdateData.closedAt = new Date().toISOString();
            } else if (ticketUpdateData.status && ticketUpdateData.status !== 'closed' && existingTicket.status === 'closed') {
                ticketUpdateData.reopen = {
                    ...(existingTicket.reopen || {}),
                    lastReopenedAt: new Date().toISOString(),
                    reopenCount: (existingTicket.reopen?.reopenCount || 0) + 1
                };
                ticketUpdateData.closedAt = null;
            }

            // Handle new message
            if (message) {
                ticketUpdateData.lastMessage = message;
                ticketUpdateData.lastMessageAt = new Date().toISOString();
                if (lastMessageBy) ticketUpdateData.lastMessageBy = lastMessageBy;
            }
            if (assignee) {
                ticketUpdateData.assigneeId = assignee.id;
            }

            // Update ticket
            const { data: updatedTicket, error: updateError } = await supabase
                .from(this.entityName)
                .update(ticketUpdateData)
                .eq('id', existingTicket.id)
                .select()
                .single();

            if (updateError) throw new errors.DBError(updateError.message);

            // Fire-and-forget async updates
            this._updateRecipientsAndAssignee(existingTicket.id, recipients, assignee);
            this._publishTicketEvent(updatedTicket, ticketUpdateData, previousAssigneeId);

            // Build simplified response
            return {
                id: updatedTicket.id,
                sno: updatedTicket.sno,
                subject: updatedTicket.title,
                description: updatedTicket.description,
                status: updatedTicket.status,
                priority: updatedTicket.priority === 2 ? 'high' : updatedTicket.priority === 1 ? 'medium' : 'low',
                createdAt: updatedTicket.createdAt,
                updatedAt: updatedTicket.updatedAt,
                language: updatedTicket.language || 'en',
                type: updatedTicket.type || 'general'
            };
        } catch (err) {
            console.error("updateTicket error:", err);
            throw err;
        }
    }

    // 🔧 Background tasks extracted for clarity
    async _updateRecipientsAndAssignee(ticketId, recipients, assignee) {
        try {
            if (recipients?.length) {
                await supabase.from('ticketMentions').delete().eq('ticketId', ticketId);
                await supabase.from('ticketCustomers').delete().eq('ticketId', ticketId);
                await Promise.all(recipients.map(recipient => (
                    Promise.all([
                        supabase.from('ticketMentions').insert({ ticketId, userId: recipient.id }),
                        supabase.from('ticketCustomers').insert({ ticketId, customerId: recipient.id })
                    ])
                )));
            }

            if (assignee?.id) {
                await supabase.from('ticketAssignees').delete().eq('ticketId', ticketId);
                await supabase.from('ticketAssignees').insert({ ticketId, userId: assignee.id });
            }
        } catch (err) {
            console.error('Failed to update recipients or assignee:', err);
        }
    }

    async _publishTicketEvent(updatedTicket, updateData, previousAssigneeId) {
        try {
            const publisher = new TicketEventPublisher();
            const isReassigned = previousAssigneeId !== updatedTicket.assigneeId;

            if (isReassigned) {
                await publisher.reassigned(updatedTicket, {
                    from: previousAssigneeId,
                    to: updatedTicket.assigneeId
                });
            } else {
                await publisher.updated(updatedTicket, updateData);
            }
        } catch (err) {
            console.error('Failed to publish ticket event:', err);
        }
    }


    async getDetails(identifier, workspaceId, clientId, includeDetails = false) {
        try {
            console.log(`getDetails: Starting for identifier ${identifier}`);

            // Determine if identifier is a uuid or sno (serial number)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

            // Build the query based on the identifier type
            let query = supabase.from(this.entityName).select('*');

            if (isUuid) {
                console.log(`getDetails: Using UUID ${identifier}`);
                query = query.eq('id', identifier);
            } else {
                console.log(`getDetails: Using SNO ${identifier}`);
                query = query.eq('sno', identifier);
            }

            // FIXED: Use camelCase column names as per the database schema
            query = query.eq('workspaceId', workspaceId).eq('clientId', clientId);

            console.log(`getDetails: Executing query for ${isUuid ? 'UUID' : 'SNO'} ${identifier}`);

            // Execute the query
            const { data: ticket, error } = await query.single();

            if (error) {
                console.log("Error fetching ticket:", error);
                throw new errors.DBError(error.message);
            }

            if (!ticket) {
                throw new errors.NotFound("Ticket not found");
            }

            console.log(`getDetails: Ticket found with ID ${ticket.id}`);

            // Create a simplified base response first in case the queries below fail
            const baseResponse = {
                id: ticket.id,
                sno: ticket.sno,
                subject: ticket.title,
                description: ticket.description,
                status: ticket.status,
                statusType: ticket.statusId,
                priority: ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low',
                customerId: ticket.customerId,
                companyId: ticket.companyId,
                teamId: ticket.teamId,
                lastMessage: ticket.lastMessage,
                lastMessageAt: ticket.lastMessageAt,
                lastMessageBy: ticket.lastMessageBy,
                channel: ticket.channel,
                device: ticket.device,
                intents: ticket.intents,
                sentiment: ticket.sentiment,
                language: ticket.language || 'en',
                type: ticket.type || 'general',
                createdAt: ticket.createdAt,
                updatedAt: ticket.updatedAt,
                closedAt: ticket.closedAt,
                isUnread: Boolean(ticket.unread),
                tags: ticket.tagIds || [],
                externalId: ticket.externalId,
                threadId: ticket.threadId,
                customFields: ticket.customFields || {},
                topicIds: ticket.topicIds || [],
                mentionIds: ticket.mentionIds || [],
                reopenInfo: ticket.reopen || null
            };

            // Set a timeout to ensure we return something even if queries hang
            const timeoutPromise = new Promise(resolve => {
                setTimeout(() => {
                    console.log(`getDetails: Timeout reached, returning base response for ${ticket.id}`);
                    resolve({
                        timedOut: true,
                        data: baseResponse
                    });
                }, 3000); // 3 second timeout
            });

            // Create the promise for the full data fetch
            const fullDataPromise = (async () => {
                console.log(`getDetails: Fetching related data for ticket ${ticket.id}`);
                try {
                    // Fetch related data with proper error handling for each query
                    const fetchWithErrorHandling = async (promise) => {
                        try {
                            return await promise;
                        } catch (err) {
                            console.error('Error fetching related data:', err);
                            return { data: [] };
                        }
                    };

                    // Create all the promises with error handling
                    const customersPromise = fetchWithErrorHandling(
                        supabase.from('ticketCustomers')
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
                            .eq('ticketId', ticket.id)
                    );

                    const assigneesPromise = fetchWithErrorHandling(
                        supabase.from('ticketAssignees')
                            .select('userId, users(id, name, email, role)')
                            .eq('ticketId', ticket.id)
                    );

                    const mentionsPromise = fetchWithErrorHandling(
                        supabase.from('ticketMentions')
                            .select('userId, users(id, email, name)')
                            .eq('ticketId', ticket.id)
                    );

                    const companiesPromise = fetchWithErrorHandling(
                        supabase.from('ticketCompanies')
                            .select('companyId, companies(id, name, domain)')
                            .eq('ticketId', ticket.id)
                    );

                    // Fetch tags if the ticket has tagIds
                    const tagsPromise = ticket.tagIds && ticket.tagIds.length > 0
                        ? fetchWithErrorHandling(
                            supabase.from('tags').select('id, name, color').in('id', ticket.tagIds)
                        )
                        : Promise.resolve({ data: [] });

                    // Fetch conversation count if detailed info is requested
                    const messageCountPromise = includeDetails
                        ? fetchWithErrorHandling(
                            supabase.from('conversations')
                                .select('*', { count: 'exact', head: true })
                                .match({ ticket_id: ticket.id })
                        )
                        : Promise.resolve({ count: 0 });

                    console.log(`getDetails: Waiting for all queries to complete for ticket ${ticket.id}`);

                    // Wait for all queries to complete with a timeout
                    const [
                        { data: customers },
                        { data: assignees },
                        { data: mentions },
                        { data: companies },
                        { data: tagData },
                        { count: messageCount }
                    ] = await Promise.all([
                        customersPromise,
                        assigneesPromise,
                        mentionsPromise,
                        companiesPromise,
                        tagsPromise,
                        messageCountPromise
                    ]);

                    console.log(`getDetails: All queries completed for ticket ${ticket.id}`);

                    // Process the results
                    const primaryCustomer = customers?.[0]?.users;
                    const primaryCompany = companies?.[0]?.companies ||
                        (primaryCustomer?.company ? primaryCustomer.company : null);
                    const recipientEmails = mentions?.map(m => m.users?.email).filter(Boolean) || [];
                    const formattedTags = tagData?.map(tag => ({
                        id: tag.id,
                        name: tag.name,
                        color: tag.color
                    })) || [];

                    // Build the complete response
                    const response = {
                        ...baseResponse,
                        customer: {
                            id: primaryCustomer?.id,
                            name: `${primaryCustomer?.firstname || ''} ${primaryCustomer?.lastname || ''}`.trim() || primaryCustomer?.email || 'Unknown',
                            email: primaryCustomer?.email,
                            phone: primaryCustomer?.phone,
                            type: primaryCustomer?.type,
                            title: primaryCustomer?.title,
                            department: primaryCustomer?.department
                        },
                        company: primaryCompany ? {
                            id: primaryCompany.id,
                            name: primaryCompany.name,
                            domain: primaryCompany.domain
                        } : null,
                        assignee: assignees?.[0]?.users ? {
                            id: assignees[0].users.id,
                            name: assignees[0].users.name,
                            email: assignees[0].users.email,
                            role: assignees[0].users.role
                        } : null,
                        assigneeStatus: assignees?.[0]?.users ? 'Assigned' : 'Unassigned',
                        tags: formattedTags,
                        recipients: recipientEmails,
                        messageCount: messageCount || 0,
                        hasNotification: false,
                        notificationType: null
                    };

                    console.log(`getDetails: Response built successfully for ticket ${ticket.id}`);
                    return {
                        timedOut: false,
                        data: response
                    };
                } catch (error) {
                    console.error('Error building full response:', error);
                    return {
                        timedOut: false,
                        data: baseResponse,
                        error
                    };
                }
            })();

            // Race the timeout against the full data promise
            const result = await Promise.race([timeoutPromise, fullDataPromise]);

            console.log(`getDetails: Returning ${result.timedOut ? 'partial (timeout)' : 'complete'} response for ticket ${ticket.id}`);

            return result.data;
        } catch (err) {
            console.log("getDetails error:", err);
            throw err;
        }
    }

    /**
     * List tickets assigned to a specific team
     */
    async listTicketsByTeam(filters) {
        try {
            const { teamId, clientId, workspaceId, status, priority, skip = 0, limit = 10 } = filters;

            if (!teamId) {
                return Promise.reject(new errors.BadRequest("Team ID is required"));
            }

            let query = supabase
                .from(this.entityName)
                .select(`
                    id, sno, title, description, status, priority, teamId,
                    assigneeId, lastMessage, lastMessageAt, created_at, updated_at,
                    teams!teamId(id, name),
                    users!assigneeId(id, name, email)
                `)
                .eq('teamId', teamId)
                .eq('clientId', clientId)
                .is('deletedAt', null);

            if (workspaceId) query = query.eq('workspaceId', workspaceId);
            if (status) query = query.eq('status', status);
            if (priority !== undefined) query = query.eq('priority', priority);

            const { data: tickets, error } = await query
                .order('created_at', { ascending: false })
                .range(skip, skip + limit - 1);

            if (error) throw error;

            // Format ticket priorities
            return tickets.map(ticket => ({
                ...ticket,
                priority: ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low',
                team: ticket.teams,
                assignee: ticket.users,
            }));
        } catch (error) {
            console.error('Error listing team tickets:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    /**
     * List tickets assigned to any team the user belongs to
     */
    async listTicketsForUserTeams(userId, filters = {}) {
        try {
            const { status, workspaceId, clientId, priority, skip = 0, limit = 10 } = filters;

            // First, get all teams the user belongs to
            const { data: userTeams, error: teamsError } = await supabase
                .from('teamMembers')
                .select('team_id')
                .eq('user_id', userId);

            if (teamsError) throw teamsError;

            // No teams found
            if (!userTeams || userTeams.length === 0) {
                return [];
            }

            const teamIds = userTeams.map(team => team.team_id);

            // Get all tickets assigned to these teams
            let query = supabase
                .from(this.entityName)
                .select(`
                    id, sno, title, description, status, priority, teamId,
                    assigneeId, lastMessage, lastMessageAt, created_at, updated_at,
                    teams!teamId(id, name),
                    users!assigneeId(id, name, email)
                `)
                .in('teamId', teamIds)
                .eq('clientId', clientId)
                .is('deletedAt', null);

            if (workspaceId) query = query.eq('workspaceId', workspaceId);
            if (status) query = query.eq('status', status);
            if (priority !== undefined) query = query.eq('priority', priority);

            const { data: tickets, error } = await query
                .order('created_at', { ascending: false })
                .range(skip, skip + limit - 1);

            if (error) throw error;

            // Format ticket priorities
            return tickets.map(ticket => ({
                ...ticket,
                priority: ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low',
                team: ticket.teams,
                assignee: ticket.users,
            }));
        } catch (error) {
            console.error('Error listing user team tickets:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    /**
     * Assign a ticket to a team
     */
    async assignTicketToTeam(ticketId, teamId, workspaceId, clientId) {
        try {
            // Update ticket with new team
            const { data: updatedTicket, error } = await supabase
                .from(this.entityName)
                .update({
                    teamId,
                    updated_at: new Date()
                })
                .eq('id', ticketId)
                .eq('clientId', clientId)
                .eq('workspaceId', workspaceId)
                .select()
                .single();

            if (error) throw error;

            // Publish team assignment event
            const inst = new TicketEventPublisher();
            await inst.teamAssigned(updatedTicket, teamId);

            return updatedTicket;
        } catch (error) {
            console.error('Error assigning ticket to team:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    /**
     * Assign a ticket to a user
     */
    async assignTicketToUser(sno, userId, workspaceId, clientId) {
        try {
            console.log(`Assigning ticket ${sno} to user ${userId}`);

            if (!userId) {
                throw new errors.ValidationFailed("User ID is required");
            }

            // Get the ticket
            const { data: ticket, error: ticketError } = await supabase
                .from(this.entityName)
                .select('id')
                .eq('sno', sno)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .single();

            if (ticketError) {
                console.error("Error fetching ticket:", ticketError);
                throw ticketError;
            }

            if (!ticket || !ticket.id) {
                throw new errors.NotFound(`Ticket with SNO ${sno} not found`);
            }

            console.log(`Found ticket with ID ${ticket.id}, now checking if user exists`);

            // First verify the user exists
            const { data: userExists, error: userCheckError } = await supabase
                .from('users')
                .select('id')
                .eq('id', userId)
                .single();

            if (userCheckError) {
                console.error("Error verifying user:", userCheckError);
                throw new errors.NotFound(`User with ID ${userId} not found`);
            }

            console.log(`User exists, deleting existing assignments for ticket ${ticket.id}`);

            // Delete any existing assignments
            const { error: deleteError } = await supabase
                .from('ticketAssignees')
                .delete()
                .eq('ticketId', ticket.id);

            if (deleteError) {
                console.error("Error deleting existing assignments:", deleteError);
                throw deleteError;
            }

            console.log(`Creating new assignment for ticket ${ticket.id} to user ${userId}`);

            // Create new assignment
            const { data: assigneeEntry, error: assigneeError } = await supabase
                .from('ticketAssignees')
                .insert({ ticketId: ticket.id, userId })
                .select()
                .single();

            if (assigneeError) {
                console.error("Error creating assignment:", assigneeError);
                throw assigneeError;
            }

            console.log(`Assignment created with ID ${assigneeEntry.id}, updating ticket with assigneeId`);

            // Update ticket with assigneeId and updated_at timestamp
            const { data: updatedTicket, error: updateError } = await supabase
                .from(this.entityName)
                .update({
                    assigneeId: assigneeEntry.id, // Set assigneeId to the ID of the new ticketAssignees entry
                    updatedAt: new Date().toISOString()
                })
                .eq('id', ticket.id)
                .select()
                .single();

            if (updateError) {
                console.error("Error updating ticket with assigneeId:", updateError);
                throw updateError;
            }

            console.log(`Ticket updated with assigneeId ${assigneeEntry.id}, fetching user details for response`);

            // Return user details with the assignment
            const { data: userDetails, error: userError } = await supabase
                .from('users')
                .select('id, name, email, role')
                .eq('id', userId)
                .single();

            if (userError) {
                console.error("Error fetching user details:", userError);
                // Don't throw here - we'll just return the assignment info without user details
            }

            return {
                success: true,
                ticket: {
                    id: ticket.id,
                    sno: sno,
                    assigneeId: assigneeEntry.id // Include this in the response
                },
                assignee: userDetails || { id: userId, name: "Unknown User" },
                assigneeStatus: 'Assigned'
            };
        } catch (error) {
            console.error('Error assigning ticket to user:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    /**
     * Helper method to handle errors
     */
    handleError(error) {
        console.log(error);
        if (error.code === "PGRST116") {
            return new errors.NotFound(`${this.entityName} not found.`);
        }
        return error;
    }
}

module.exports = TicketService;
