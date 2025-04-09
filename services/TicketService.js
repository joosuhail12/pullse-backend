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
            console.log('Start of updating ticket');

            const { id, sno, workspaceId, clientId } = ticketIdentifier;
            const { message, recipients, assignee, ...ticketUpdateData } = updateData;

            console.log('Processing ticket update data', { id, sno, hasRecipients: !!recipients, hasAssignee: !!assignee });

            // Format priority if provided
            if (ticketUpdateData.priority !== undefined) {
                if (typeof ticketUpdateData.priority === 'string') {
                    ticketUpdateData.priority = ticketUpdateData.priority === 'high' ? 2 :
                        ticketUpdateData.priority === 'medium' ? 1 : 0;
                }
            }

            // Handle subject to title mapping
            if (ticketUpdateData.subject) {
                ticketUpdateData.title = ticketUpdateData.subject;
                delete ticketUpdateData.subject;
            }

            // Set updated timestamp
            ticketUpdateData.updatedAt = new Date().toISOString();

            console.log('Fetching existing ticket');
            // Fetch the ticket first to ensure it exists
            let query = supabase.from(this.entityName).select('*');

            if (id) {
                query = query.eq('id', id);
            } else if (sno) {
                query = query.eq('sno', sno);
            } else {
                throw new errors.ValidationFailed("Either id or sno is required to update a ticket");
            }

            // FIXED: Use camelCase column names as per the database schema
            query = query.eq('workspaceId', workspaceId).eq('clientId', clientId);

            const { data: existingTicket, error: fetchError } = await query.single();

            if (fetchError || !existingTicket) {
                console.log("Ticket lookup failed:", fetchError, "ID:", id, "SNO:", sno, "Workspace:", workspaceId);
                throw new errors.NotFound("Ticket not found");
            }

            console.log('Existing ticket found:', existingTicket.id);

            // Handle status changes
            if (ticketUpdateData.status === 'closed' && existingTicket.status !== 'closed') {
                ticketUpdateData.closedAt = new Date().toISOString();
            } else if (ticketUpdateData.status && ticketUpdateData.status !== 'closed' && existingTicket.status === 'closed') {
                // Ticket being reopened
                ticketUpdateData.reopen = {
                    ...(existingTicket.reopen || {}),
                    lastReopenedAt: new Date().toISOString(),
                    reopenCount: ((existingTicket.reopen?.reopenCount || 0) + 1)
                };
                ticketUpdateData.closedAt = null;
            }

            // Update message-related fields if a new message is provided
            if (message) {
                ticketUpdateData.lastMessage = message;
                ticketUpdateData.lastMessageAt = new Date().toISOString();
                if (updateData.lastMessageBy) {
                    ticketUpdateData.lastMessageBy = updateData.lastMessageBy;
                }
            }

            console.log('Updating ticket in database');
            // Update the ticket in the database
            const { data: updatedTicket, error: updateError } = await supabase
                .from(this.entityName)
                .update(ticketUpdateData)
                .eq('id', existingTicket.id)
                .select()
                .single();

            if (updateError) {
                console.log("Update error:", updateError);
                throw new errors.DBError(updateError.message);
            }

            console.log('Ticket updated successfully:', updatedTicket.id);

            // Start preparing the response immediately after the main update
            console.log('Preparing response data');

            // ADDED DETAILED LOGGING
            console.log('Step 1: Creating simplified response');
            // Immediately create a simplified response
            const simplifiedResponse = {
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

            console.log('Step 2: Processing secondary updates (background)');
            // Process additional operations in the background
            if (recipients && recipients.length > 0) {
                console.log('Processing recipients update (not waiting)');
                (async () => {
                    try {
                        await supabase.from('ticketMentions').delete().eq('ticketId', existingTicket.id);
                        await supabase.from('ticketCustomers').delete().eq('ticketId', existingTicket.id);

                        await Promise.all(recipients.map(async (recipient) => {
                            await supabase.from('ticketMentions').insert({ ticketId: existingTicket.id, userId: recipient.id });
                            await supabase.from('ticketCustomers').insert({ ticketId: existingTicket.id, customerId: recipient.id });
                        }));
                        console.log('Recipients updated successfully');
                    } catch (err) {
                        console.error('Failed to update recipients:', err);
                    }
                })();
            }

            if (assignee?.id) {
                console.log('Processing assignee update (not waiting)');
                (async () => {
                    try {
                        await supabase.from('ticketAssignees').delete().eq('ticketId', existingTicket.id);
                        await supabase.from('ticketAssignees').insert({ ticketId: existingTicket.id, userId: assignee.id });
                        console.log('Assignee updated successfully');
                    } catch (err) {
                        console.error('Failed to update assignee:', err);
                    }
                })();
            }

            // Publish event in background
            console.log('Publishing event (not waiting)');
            (async () => {
                try {
                    const inst = new TicketEventPublisher();
                    await inst.updated(updatedTicket, ticketUpdateData);
                    console.log('Event published successfully');
                } catch (err) {
                    console.error('Failed to publish event:', err);
                }
            })();

            console.log('Step 3: Returning simplified response');
            // Return the simplified response immediately
            return simplifiedResponse;
        } catch (err) {
            console.log(err, "err---");
            throw err;
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
