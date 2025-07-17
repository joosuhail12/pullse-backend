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
const Ably = require("ably");
const { setAblyTicketChatListener } = require("../ExternalService/ablyListener");
const { subscribeToTicketChannels } = require("../ablyServices/listeners");
const ably = new Ably.Realtime(process.env.ABLY_API_KEY);

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
            // console.log("insertedTicket", insertedTicket);
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
            // console.log(err, "err---");
            throw err;
        }
    }

    async listTickets(req) {
        try {
            const { clientId, workspaceId, userId, skip = 0, limit = 10, page = 1 } = req;
            // Role check: org admin can see all tickets for workspace/client
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, roleIds')
                .eq('id', userId)
                .single();
            if (userError) throw userError;
            let isOrgAdmin = false;
            if (user && user.roleIds) {
                const roleIdArr = Array.isArray(user.roleIds) ? user.roleIds : [user.roleIds];
                const { data: roles, error: rolesError } = await supabase
                    .from('userRoles')
                    .select('name')
                    .in('id', roleIdArr);
                if (rolesError) throw rolesError;
                isOrgAdmin = (roles || []).some(r => r.name === 'ORGANIZATION_ADMIN');
            } else {
                // Fallback: check workspacePermissions for this user and workspace
                const { data: perms, error: permsError } = await supabase
                    .from('workspacePermissions')
                    .select('role')
                    .eq('userId', userId)
                    .eq('workspaceId', workspaceId)
                    .single();
                if (permsError && permsError.code !== 'PGRST116') throw permsError;
                if (perms && perms.role && perms.role === 'ORGANIZATION_ADMIN') {
                    isOrgAdmin = true;
                }
            }
            const actualSkip = page > 1 ? (page - 1) * limit : skip;
            let allTicketIds = [];
            if (isOrgAdmin) {
                // Fetch all ticket IDs for workspace/client
                const { data: allTickets, error: allTicketsError } = await supabase
                    .from(this.entityName)
                    .select('id')
                    .eq('workspaceId', workspaceId)
                    .eq('clientId', clientId);
                if (allTicketsError) throw new errors.DBError(allTicketsError.message);
                allTicketIds = allTickets.map(t => t.id);
            } else {
                // get all teams for the user
                const { data: teams, error: teamsError } = await supabase
                    .from('teamMembers')
                    .select('team_id')
                    .eq('user_id', userId);
                if (teamsError) throw new errors.DBError(teamsError.message);
                const teamIds = teams.map(team => team.team_id);
                // get all tickets id from ticket_teams for the teams in loop
                const tickets = [];
                for (const teamId of teamIds) {
                    const { data: teamTickets, error: ticketsError } = await supabase
                        .from('ticket_teams')
                        .select('ticket_id, teams(id, name)')
                        .eq('team_id', teamId)
                    if (ticketsError) throw new errors.DBError(ticketsError.message);
                    if (teamTickets && teamTickets.length > 0) {
                        tickets.push(...teamTickets.map(ticket => ({ ticket_id: ticket.ticket_id, team_id: ticket.teams.id, team_name: ticket.teams.name })));
                    }
                }
                allTicketIds = tickets.map(ticket => ticket.ticket_id);
            }
            // get paginated tickets from the tickets table
            const { data: ticketsData, error: ticketsDataError } = await supabase
                .from(this.entityName)
                .select('*, assignedTo(id, name, email, bot_enabled)')
                .in('id', allTicketIds)
                .order('updatedAt', { ascending: false })
                .range(actualSkip, actualSkip + limit - 1);
            if (ticketsDataError) {
                throw new errors.DBError(ticketsDataError.message);
            }
            // Filter out tickets assigned to bot users
            const assignedToUserIds = ticketsData.map(ticket => ticket.assignedTo).filter(Boolean);
            let botUserIds = [];
            if (assignedToUserIds.length > 0) {
                const { data: assignedUsers, error: usersError } = await supabase
                    .from('users')
                    .select('id, bot_enabled')
                    .in('id', assignedToUserIds);

                if (!usersError && assignedUsers) {
                    botUserIds = assignedUsers
                        .filter(user => user.bot_enabled)
                        .map(user => user.id);
                }
            }

            // Remove tickets assigned to bot users
            const filteredTicketsData = ticketsData.filter(ticket => !botUserIds.includes(ticket.assignedTo));
            // const {data:teamId, error:teamIdError} = await supabase
            //     .from('ticket_team')
            //     .select('teamId')
            //     .eq('workspaceId', workspaceId)
            //     .eq('clientId', clientId)
            //     .single();
            // console.log(teamId, "teamId---");

            // const { data: tickets, error } = await supabase
            //     .from(this.entityName)
            //     .select('*, assignedTo(id, bot_enabled)')
            //     .match({ workspaceId, clientId })
            //     .not("assignedTo.bot_enabled", "is", true)
            //     .order('updatedAt', { ascending: false });

            // if (error) {
            //     throw new errors.DBError(error.message);
            // }

            // Before enriching tickets, fetch full team mappings for the relevant ticket IDs
            const { data: ticketTeamsData, error: ticketTeamsErr } = await supabase
                .from('ticket_teams')
                .select('ticket_id, teams(id,name)')
                .in('ticket_id', allTicketIds);
            if (ticketTeamsErr) throw new errors.DBError(ticketTeamsErr.message);

            const ticketTeamsMap = ticketTeamsData?.reduce((acc, row) => {
                if (!acc[row.ticket_id]) acc[row.ticket_id] = [];
                acc[row.ticket_id].push({ id: row.teams.id, name: row.teams.name });
                return acc;
            }, {}) || {};

            const enrichedTickets = await Promise.map(filteredTicketsData, async (ticket) => {
                const { data: customers } = await supabase
                    .from('customers')
                    .select(`*`)
                    .eq('id', ticket.customerId)
                    .single();

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

                // Fetch tags via join table ticketTags
                const { data: tagRows } = await supabase
                    .from('ticketTags')
                    .select('tags(id, name, color)')
                    .eq('ticketId', ticket.id);

                const formattedTags = tagRows?.map(tr => ({
                    id: tr.tags.id,
                    name: tr.tags.name,
                    color: tr.tags.color
                })) || [];

                // Fetch assignedTo user details if assignedTo exists
                let assignedToObj = null;
                if (ticket.assignedTo && typeof ticket.assignedTo === 'object') {
                    assignedToObj = {
                        id: ticket.assignedTo.id,
                        name: ticket.assignedTo.name,
                        email: ticket.assignedTo.email,
                        bot_enabled: ticket.assignedTo.bot_enabled
                    };
                } else if (ticket.assignedTo) {
                    const { data: user } = await supabase
                        .from('users')
                        .select('id, name, email')
                        .eq('id', ticket.assignedTo)
                        .single();
                    if (user) {
                        assignedToObj = { ...user };
                    }
                }

                // Fetch team details if teamId exists
                let teamData = null;
                if (ticket.teamId) {
                    const { data: team } = await supabase
                        .from('teams')
                        .select('id, name')
                        .eq('id', ticket.teamId)
                        .single();

                    if (team) {
                        teamData = team;
                    }
                }


                // Fetch ticket type data if typeId exists
                const ticketTypePromise = ticket.typeId
                    ? supabase.from('ticketTypes').select('id, name, type').eq('id', ticket.typeId)
                    : Promise.resolve({ data: null });

                const { data: ticketType } = await ticketTypePromise;

                const { count: messageCount } = await supabase
                    .from('conversations')
                    .select('*', { count: 'exact', head: true })
                    .match({ ticket_id: ticket.id });
                // console.log(customers, "customers---");
                const primaryCustomer = customers;
                const primaryCompany = companies?.[0]?.companies ||
                    (primaryCustomer?.company ? primaryCustomer.company : null);
                const recipientEmails = mentions?.map(m => m.users?.email).filter(Boolean) || [];
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
                        name: `${primaryCustomer?.firstname || ''} ${primaryCustomer?.lastname || ''}`.trim() || primaryCustomer?.email || 'Unknown',
                        email: primaryCustomer?.email,
                        phone: primaryCustomer?.phone
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

                    assignedTo: ticket.assignedTo,
                    assignedToUser: assignedToObj,

                    teamIds: (ticketTeamsMap[ticket.id] || []).map(t => t.id),
                    teams: ticketTeamsMap[ticket.id] || [],
                    // legacy single team fields kept for backward compatibility
                    teamId: ticket.teamId,
                    team: ticketTeamsMap[ticket.id] || [],

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

            // Add a count query for total tickets (excluding bot tickets)
            let totalCount = 0;
            // checking if enriched tickets is not empty
            if (allTicketIds.length > 0) {
                const { count, error: countError } = await supabase
                    .from(this.entityName)
                    .select('*', { count: 'exact', head: true })
                    .in('id', allTicketIds);
                if (countError) throw new errors.DBError(countError.message);
                totalCount = count || 0;
            }
            // Get bot user IDs for count filtering
            let botUserIdsForCount = [];
            const { data: allAssignedUsers, error: allUsersError } = await supabase
                .from('users')
                .select('id, bot_enabled')
                .eq('bot_enabled', true);
            if (!allUsersError && allAssignedUsers) {
                botUserIdsForCount = allAssignedUsers.map(user => user.id);
            }
            // Get count of tickets assigned to bot users
            let botTicketsCount = 0;
            if (botUserIdsForCount.length > 0 && allTicketIds.length > 0) {
                const { count: botCount, error: botCountError } = await supabase
                    .from(this.entityName)
                    .select('*', { count: 'exact', head: true })
                    .in('id', allTicketIds)
                    .in('assignedTo', botUserIdsForCount);
                if (!botCountError) {
                    botTicketsCount = botCount || 0;
                }
            }
            // Return enriched tickets with total count outside of data (excluding bot tickets)
            return {
                status: "success",
                message: "Successfully done",
                data: enrichedTickets,
                total: (totalCount || 0) - botTicketsCount
            };
        } catch (err) {
            console.log(err, "err---");
            throw err;
        }
    }

    async updateTicket(ticketIdentifier, updateData) {
        try {
            const { id, sno, workspaceId, clientId } = ticketIdentifier;
            const { message, recipients, assignee, lastMessageBy, assigneeId, assignedTo, ...ticketUpdateData } = updateData;

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

            // Handle assignee fields
            if (assigneeId) {
                ticketUpdateData.assigneeId = assigneeId;
            }
            if (assignedTo) {
                ticketUpdateData.assignedTo = assignedTo;
            }

            // Fetch ticket
            let query = supabase.from(this.entityName).select('*');
            if (id) {
                query = query.eq('id', id);
            } else if (sno) {
                query = query.eq('sno', sno);
            } else {
                throw new errors.ValidationFailed("Either id or sno is required to update a ticket");
            }
            query = query.eq('workspaceId', workspaceId).eq('clientId', clientId);

            const { data: existingTicket, error: fetchError } = await query.single();
            if (fetchError || !existingTicket) throw new errors.NotFound("Ticket not found");

            const previousAssigneeId = existingTicket.assigneeId;
            const previousTeamId = existingTicket.teamId;

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

            // Get team details if teamId is changing
            let teamData = null;
            if (ticketUpdateData.teamId && ticketUpdateData.teamId !== previousTeamId) {
                const { data: team, error: teamError } = await supabase
                    .from('teams')
                    .select('id, name')
                    .eq('id', ticketUpdateData.teamId)
                    .single();

                if (!teamError && team) {
                    teamData = team;
                }
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
            if (assigneeId) {
                await this._updateRecipientsAndAssignee(existingTicket.id, recipients, { id: assigneeId });
            }
            this._publishTicketEvent(updatedTicket, ticketUpdateData, previousAssigneeId);

            // For team assignments, publish team assignment event
            if (ticketUpdateData.teamId && ticketUpdateData.teamId !== previousTeamId) {
                try {
                    const inst = new TicketEventPublisher();
                    await inst.teamAssigned(updatedTicket, ticketUpdateData.teamId);
                } catch (eventError) {
                    console.error("Error publishing team assignment event:", eventError);
                    // Don't fail if just the event publishing fails
                }
            }

            // If assignedTo or assigneeId was specified, get user details and include in response
            if (assignedTo || assigneeId) {
                const userId = assignedTo || assigneeId;
                const { data: userDetails } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .eq('id', userId)
                    .single();

                return {
                    success: true,
                    ticket: {
                        id: updatedTicket.id,
                        sno: updatedTicket.sno,
                        assigneeId: updatedTicket.assigneeId,
                        assignedTo: updatedTicket.assignedTo
                    },
                    assignedTo: userDetails || { id: userId, name: "Unknown User" },
                    assigneeStatus: 'Assigned'
                };
            }

            // Return default response if no special cases matched
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

            // Determine if identifier is a uuid or sno (serial number)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

            // Build the query based on the identifier type
            let query = supabase.from(this.entityName).select('*');

            if (isUuid) {
                query = query.eq('id', identifier);
            } else {
                query = query.eq('sno', identifier);
            }

            // FIXED: Use camelCase column names as per the database schema
            query = query.eq('workspaceId', workspaceId).eq('clientId', clientId);


            // Execute the query
            const { data: ticket, error } = await query.single();

            if (error) {
                // console.log("Error fetching ticket:", error);
                throw new errors.DBError(error.message);
            }

            if (!ticket) {
                throw new errors.NotFound("Ticket not found");
            }


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
                assignedTo: ticket.assignedTo,
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
                    resolve({
                        timedOut: true,
                        data: baseResponse
                    });
                }, 3000); // 3 second timeout
            });

            // Create the promise for the full data fetch
            const fullDataPromise = (async () => {
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
                                customers(
                                    id, 
                                    email, 
                                    firstname, 
                                    lastname, 
                                    phone
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

                    // Fetch assignedTo user details if it exists
                    const assignedToUserPromise = ticket.assignedTo
                        ? fetchWithErrorHandling(
                            supabase.from('users')
                                .select('id, name, email')
                                .eq('id', ticket.assignedTo)
                                .single()
                        )
                        : Promise.resolve({ data: null });

                    // Fetch team details if teamId exists
                    const teamPromise = ticket.teamId
                        ? fetchWithErrorHandling(
                            supabase.from('teams')
                                .select('id, name')
                                .eq('id', ticket.teamId)
                                .single()
                        )
                        : Promise.resolve({ data: null });

                    // Fetch tags via ticketTags join table
                    const tagsPromise = fetchWithErrorHandling(
                        supabase.from('ticketTags')
                            .select('tags(id, name, color)')
                            .eq('ticketId', ticket.id)
                    );

                    // Fetch conversation count if detailed info is requested
                    const messageCountPromise = includeDetails
                        ? fetchWithErrorHandling(
                            supabase.from('conversations')
                                .select('*', { count: 'exact', head: true })
                                .match({ ticket_id: ticket.id })
                        )
                        : Promise.resolve({ count: 0 });


                    // Wait for all queries to complete with a timeout
                    const [
                        { data: customers },
                        { data: assignees },
                        { data: mentions },
                        { data: companies },
                        { data: tagData },
                        { count: messageCount },
                        { data: assignedToUser },
                        { data: team }
                    ] = await Promise.all([
                        customersPromise,
                        assigneesPromise,
                        mentionsPromise,
                        companiesPromise,
                        tagsPromise,
                        messageCountPromise,
                        assignedToUserPromise,
                        teamPromise
                    ]);


                    // Process the results
                    const primaryCustomer = customers?.[0]?.customers;
                    const primaryCompany = companies?.[0]?.companies ||
                        (primaryCustomer?.company ? primaryCustomer.company : null);
                    const recipientEmails = mentions?.map(m => m.users?.email).filter(Boolean) || [];
                    const formattedTags = tagData?.map(tt => ({
                        id: tt.tags.id,
                        name: tt.tags.name,
                        color: tt.tags.color
                    })) || [];

                    // Build the complete response
                    const response = {
                        ...baseResponse,
                        customer: {
                            id: primaryCustomer?.id,
                            name: `${primaryCustomer?.firstname || ''} ${primaryCustomer?.lastname || ''}`.trim() || primaryCustomer?.email || 'Unknown',
                            email: primaryCustomer?.email,
                            phone: primaryCustomer?.phone,
                            // type: primaryCustomer?.type,
                            // title: primaryCustomer?.title,
                            // department: primaryCustomer?.department
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
                        assignedToUser: assignedToUser ? {
                            id: assignedToUser.id,
                            name: assignedToUser.name,
                            email: assignedToUser.email
                        } : null,
                        team: team ? {
                            id: team.id,
                            name: team.name
                        } : null,
                        tags: formattedTags,
                        recipients: recipientEmails,
                        messageCount: messageCount || 0,
                        hasNotification: false,
                        notificationType: null
                    };

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


            return result.data;
        } catch (err) {
            // console.log("getDetails error:", err);
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
                    assigneeId, assignedTo, lastMessage, lastMessageAt, createdAt, updatedAt,
                    teams!teamId(id, name),
                    users!assigneeId(id, name, email)
                `)
                .eq('teamId', teamId);
            // .eq('clientId', clientId)
            // .is('deletedAt', null);

            if (workspaceId) query = query.eq('workspaceId', workspaceId);
            if (status) query = query.eq('status', status);
            if (priority !== undefined) query = query.eq('priority', priority);

            const { data: tickets, error } = await query
                .order('createdAt', { ascending: false })
                .range(skip, skip + limit - 1);

            if (error) throw error;

            // Get assignedTo user details
            const assignedToUserIds = tickets
                .filter(ticket => ticket.assignedTo)
                .map(ticket => ticket.assignedTo);

            let assignedToUsersMap = {};
            if (assignedToUserIds.length > 0) {
                const { data: assignedToUsers } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .in('id', assignedToUserIds);

                if (assignedToUsers) {
                    assignedToUsersMap = assignedToUsers.reduce((map, user) => {
                        map[user.id] = user;
                        return map;
                    }, {});
                }
            }

            // Format ticket priorities
            return tickets.map(ticket => ({
                ...ticket,
                priority: ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low',
                team: ticket.teams,
                assignee: ticket.users,
                assignedToUser: ticket.assignedTo ? assignedToUsersMap[ticket.assignedTo] || {
                    id: ticket.assignedTo,
                    name: "Unknown User",
                    email: null
                } : null
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
                    id, sno, title, description, status, priority, teamId, customerId,
                    assigneeId, assignedTo, lastMessage, lastMessageAt, createdAt, updatedAt,
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
                .order('createdAt', { ascending: false })
                .range(skip, skip + limit - 1);

            if (error) throw error;

            // Extract customer IDs to fetch customer details
            const customerIds = tickets
                .map(ticket => ticket.customerId)
                .filter(id => id);

            // Fetch customer details
            let customerMap = {};
            if (customerIds.length > 0) {
                const { data: customers, error: customersError } = await supabase
                    .from('customers')
                    .select('id, firstname, lastname, email, phone')
                    .in('id', customerIds);

                if (customersError) {
                    console.error("Error in customers query:", customersError);
                    throw customersError;
                }

                customerMap = customers.reduce((map, customer) => {
                    map[customer.id] = customer;
                    return map;
                }, {});
            }

            // Get assignedTo user details
            const assignedToUserIds = tickets
                .filter(ticket => ticket.assignedTo)
                .map(ticket => ticket.assignedTo);

            let assignedToUsersMap = {};
            if (assignedToUserIds.length > 0) {
                const { data: assignedToUsers } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .in('id', assignedToUserIds);

                if (assignedToUsers) {
                    assignedToUsersMap = assignedToUsers.reduce((map, user) => {
                        map[user.id] = user;
                        return map;
                    }, {});
                }
            }

            // Get team members for each team
            const teamMembersPromises = teamIds.map(teamId =>
                supabase
                    .from('teamMembers')
                    .select(`
                        user_id,
                        users!user_id(id, name)
                    `)
                    .eq('team_id', teamId)
            );

            const teamMembersResults = await Promise.all(teamMembersPromises);
            const teamMembersMap = {};

            teamMembersResults.forEach((result, index) => {
                if (!result.error && result.data) {
                    teamMembersMap[teamIds[index]] = result.data.map(member => ({
                        id: member.users.id,
                        name: member.users.name
                    }));
                }
            });

            // Format ticket priorities and add team members
            return tickets.map(ticket => {
                const priority = ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low';
                const customer = ticket.customerId ? customerMap[ticket.customerId] : null;

                return {
                    ...ticket,
                    priority: priority,
                    team: {
                        ...ticket.teams,
                        members: teamMembersMap[ticket.teamId] || []
                    },
                    assignee: ticket.users,
                    assignedToUser: ticket.assignedTo ? assignedToUsersMap[ticket.assignedTo] || {
                        id: ticket.assignedTo,
                        name: "Unknown User",
                        email: null
                    } : null,
                    customerId: ticket.customerId,
                    customer: customer ? {
                        id: customer.id,
                        name: `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || customer.email || 'Unknown',
                        email: customer.email,
                        phone: customer.phone
                    } : {}
                };
            });
        } catch (error) {
            console.error('Error listing user team tickets:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    /**
     * Assign a ticket to a team
     */
    async assignTicketToTeam(id, sno, teamId, workspaceId, clientId, assignmentData = {}) {
        try {

            if (!teamId) {
                throw new errors.ValidationFailed("Team ID is required");
            }

            if (!id && !sno) {
                throw new errors.ValidationFailed("Either ticket ID or SNO is required");
            }

            // Verify team exists
            const { data: team, error: teamError } = await supabase
                .from('teams')
                .select('id, name')
                .eq('id', teamId)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .maybeSingle();

            if (teamError) {
                console.error("Error verifying team:", teamError);
                throw teamError;
            }

            if (!team) {
                throw new errors.NotFound(`Team with ID ${teamId} not found`);
            }

            // Get the ticket
            let query = supabase.from(this.entityName).select('id, sno, title');
            if (id) {
                query = query.eq('id', id);
            } else {
                query = query.eq('sno', sno);
            }
            query = query.eq('workspaceId', workspaceId).eq('clientId', clientId);

            const { data: ticket, error: ticketError } = await query.single();

            if (ticketError) {
                console.error("Error fetching ticket:", ticketError);
                throw ticketError;
            }

            if (!ticket || !ticket.id) {
                throw new errors.NotFound(`Ticket ${id ? `with ID ${id}` : `with SNO ${sno}`} not found`);
            }

            // Update ticket with teamId and updatedBy
            const updatePayload = {
                teamId: teamId,
                updatedAt: new Date().toISOString()
            };

            // Add updatedBy if provided in assignmentData
            if (assignmentData.updatedBy) {
                updatePayload.updatedBy = assignmentData.updatedBy;
            }

            const { data: updatedTicket, error: updateError } = await supabase
                .from(this.entityName)
                .update(updatePayload)
                .eq('id', ticket.id)
                .select()
                .single();

            if (updateError) {
                console.error("Error updating ticket with teamId:", updateError);
                throw updateError;
            }

            // Publish team assignment event
            // try {
            //     const inst = new TicketEventPublisher();
            //     await inst.teamAssigned(updatedTicket, teamId);
            // } catch (eventError) {
            //     console.error("Error publishing team assignment event:", eventError);
            //     // Don't fail if just the event publishing fails
            // }

            // Return enhanced response
            return {
                success: true,
                ticket: {
                    id: ticket.id,
                    sno: ticket.sno,
                    subject: ticket.title,
                    teamId: teamId
                },
                team: {
                    id: team.id,
                    name: team.name
                }
            };
        } catch (error) {
            console.error('Error assigning ticket to team:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    /**
     * Assign a ticket to a user
     */
    async assignTicketToUser(id, sno, assigneeId, assignedTo, workspaceId, clientId, assignmentData = {}) {
        try {

            if (!assigneeId && !assignedTo) {
                throw new errors.ValidationFailed("Either assigneeId or assignedTo is required");
            }

            if (!id && !sno) {
                throw new errors.ValidationFailed("Either ticket ID or SNO is required");
            }

            // Get the ticket
            let ticketQuery = supabase.from(this.entityName).select('id, assigneeId, assignedTo');
            if (id) {
                ticketQuery = ticketQuery.eq('id', id);
            } else {
                ticketQuery = ticketQuery.eq('sno', sno);
            }
            ticketQuery = ticketQuery.eq('workspaceId', workspaceId).eq('clientId', clientId);

            const { data: ticket, error: ticketError } = await ticketQuery.single();

            if (ticketError) {
                console.error("Error fetching ticket:", ticketError);
                throw ticketError;
            }

            if (!ticket || !ticket.id) {
                throw new errors.NotFound(`Ticket ${id ? `with ID ${id}` : `with SNO ${sno}`} not found`);
            }


            // Verify the users exist if provided
            const userIds = [assigneeId, assignedTo].filter(Boolean);
            if (userIds.length > 0) {
                const { data: usersExist, error: userCheckError } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .in('id', userIds);

                if (userCheckError) {
                    console.error("Error verifying users:", userCheckError);
                    throw new errors.NotFound(`Error verifying users: ${userCheckError.message}`);
                }

                if (!usersExist || usersExist.length === 0) {

                    // Try a direct query as fallback to check if users exist
                    const { data: directUsers, error: directUserError } = await supabase.rpc('get_users_by_ids', {
                        user_ids: userIds
                    });

                    if (directUserError || !directUsers || directUsers.length === 0) {
                        console.error("Error or no results in direct user query:", directUserError);
                        throw new errors.NotFound(`Users with IDs ${userIds.join(', ')} not found`);
                    }

                }
            }

            // Prepare update object with only provided fields
            const updateData = {
                updatedAt: new Date().toISOString()
            };

            // Set both fields if provided
            if (assigneeId) updateData.assigneeId = assigneeId;
            if (assignedTo) updateData.assignedTo = assignedTo;

            // If assignedTo is provided but not assigneeId, also set assigneeId to the same value
            if (assignedTo && !assigneeId) {
                updateData.assigneeId = assignedTo;
            }

            // Add updatedBy if provided in assignmentData
            if (assignmentData.updatedBy) {
                updateData.updatedBy = assignmentData.updatedBy;
            }

            // Update ticket with assigneeId and/or assignedTo fields
            const { data: updatedTicket, error: updateError } = await supabase
                .from(this.entityName)
                .update(updateData)
                .eq('id', ticket.id)
                .select()
                .single();

            if (updateError) {
                console.error("Error updating ticket:", updateError);
                throw updateError;
            }

            // Also update ticketAssignees for consistency and backward compatibility if assigneeId is provided
            if (assigneeId) {
                const { data: assigneeEntry, error: assigneeError } = await supabase
                    .from('ticketAssignees')
                    .upsert({
                        ticketId: ticket.id,
                        userId: assigneeId
                    }, {
                        onConflict: 'ticketId'
                    })
                    .select()
                    .single();

                if (assigneeError) {
                    // console.log(`Warning: Could not create ticketAssignees entry: ${assigneeError.message}`);
                    // Don't fail the whole operation if just the join table update fails
                }
            }

            // Get user details for response
            const userId = assigneeId || assignedTo;
            const { data: userDetails } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('id', userId)
                .single();

            // Return enhanced response
            return {
                success: true,
                ticket: {
                    id: ticket.id,
                    sno: updatedTicket.sno,
                    assigneeId: updatedTicket.assigneeId,
                    assignedTo: updatedTicket.assignedTo
                },
                assignee: userDetails || { id: userId, name: "Unknown User" },
                assigneeStatus: 'Assigned'
            };
        } catch (error) {
            console.error('Error assigning ticket to user:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    // get conversation by ticket id
    async getConversationByTicketId(sno, workspaceId, clientId, sessionId, userId) {
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .eq('ticketId', sno)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .order('createdAt', { ascending: false })
                .limit(10);

            const sortedData = data ? data.reverse() : [];

            if (error) throw error;

            // at this point i want to subscribe to an ably channel i.e ticket:sno
            // and return the response from the channel
            subscribeToTicketChannels(sno, clientId, workspaceId, sessionId, userId)
            const response = sortedData.map(item => ({
                id: item.id,
                content: item.message,
                sender: item.userType,
                senderName: item.senderName,
                timestamp: item.createdAt,
                isCustomer: item.userType === 'customer',
                readBy: item.readBy,
                lastReadAt: item.lastReadAt,
                reactions: item.reactions,
                type: item.type
            }));
            return response;
        } catch (error) {
            console.error('Error getting conversation by ticket id:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    /**
     * Helper method to handle errors
     */
    handleError(error) {
        // console.log(error);
        if (error.code === "PGRST116") {
            return new errors.NotFound(`${this.entityName} not found.`);
        }
        return error;
    }

    async getAssignedTickets(userId, filters = {}) {
        try {
            const { status, workspaceId, clientId, priority, skip = 0, limit = 10 } = filters;

            // Get tickets assigned to the user using assignedTo field
            let query = supabase
                .from(this.entityName)
                .select(`
                    id, sno, title, description, status, priority, customerId,
                    teamId, teams:teamId(id, name),
                    assignedTo(id, name, email, bot_enabled), lastMessage, lastMessageAt, createdAt, updatedAt
                `)
                .eq('assignedTo', userId)
                .eq('clientId', clientId)
                .eq('assignedTo.bot_enabled', false)
                .eq('status', 'open')
                .is('deletedAt', null)
                .order('updatedAt', { ascending: false });

            if (workspaceId) query = query.eq('workspaceId', workspaceId);
            if (status) query = query.eq('status', status);
            if (priority !== undefined) query = query.eq('priority', priority);

            const { data: tickets, error } = await query
                .order('createdAt', { ascending: false })
                .range(skip, skip + limit - 1);

            if (error) {
                console.error("Error fetching tickets:", error);
                throw error;
            }


            if (!tickets || tickets.length === 0) {
                return [];
            }

            // Extract customer IDs to fetch customer details
            const customerIds = tickets
                .map(ticket => ticket.customerId)
                .filter(id => id);


            // Fetch customer details
            let customerMap = {};
            if (customerIds.length > 0) {

                const { data: customers, error: customersError } = await supabase
                    .from('customers')
                    .select('*')
                    .in('id', customerIds);

                if (customersError) {
                    console.error("Error in customers query:", customersError);
                    throw customersError;
                }


                customerMap = customers.reduce((map, customer) => {
                    map[customer.id] = customer;
                    return map;
                }, {});
            }

            // Get assignee details (the user these tickets are assigned to)
            const { data: assigneeUser } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('id', userId)
                .single();

            // Fetch team details for tickets with teamId
            const teamIds = tickets
                .map(ticket => ticket.teamId)
                .filter(id => id);

            let teamMap = {};
            if (teamIds.length > 0) {
                const { data: teams, error: teamsError } = await supabase
                    .from('teams')
                    .select('id, name')
                    .in('id', teamIds);

                if (!teamsError && teams) {
                    teamMap = teams.reduce((map, team) => {
                        map[team.id] = team;
                        return map;
                    }, {});
                }
            }

            // Build mapping of ticket -> teams
            const ticketIdsForTeamFetch = tickets.map(t => t.id);
            const { data: ticketTeamsData, error: ttErr } = await supabase
                .from('ticket_teams')
                .select('ticket_id, teams(id,name)')
                .in('ticket_id', ticketIdsForTeamFetch);
            if (ttErr) {
                console.error("Error fetching ticket teams:", ttErr);
                throw ttErr;
            }
            const ticketTeamsMap = ticketTeamsData?.reduce((acc, row) => {
                if (!acc[row.ticket_id]) acc[row.ticket_id] = [];
                acc[row.ticket_id].push({ id: row.teams.id, name: row.teams.name });
                return acc;
            }, {}) || {};

            // Format ticket response
            const result = tickets.map(ticket => {
                const priority = ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low';
                const customer = ticket.customerId ? customerMap[ticket.customerId] : null;
                const teamData = ticketTeamsMap[ticket.id] || [];

                return {
                    id: ticket.id,
                    sno: ticket.sno,
                    subject: ticket.title,
                    description: ticket.description,
                    status: ticket.status,
                    priority: priority,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,
                    isUnread: false, // Default value since unread field is not fetched
                    hasNotification: false,
                    notificationType: null,
                    customerId: ticket.customerId,
                    teamIds: teamData.map(t => t.id),
                    teams: teamData,
                    teamId: ticket.teamId,
                    team: teamData,
                    assignedTo: ticket.assignedTo,
                    assignedToUser: assigneeUser ? {
                        id: assigneeUser.id,
                        name: assigneeUser.name,
                        email: assigneeUser.email
                    } : null,
                    customer: customer ? {
                        id: customer.id,
                        name: `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || customer.email || 'Unknown',
                        email: customer.email,
                        phone: customer.phone
                    } : {}
                };
            });

            // Add a count query for total assigned tickets
            const { count: totalCount, error: countError } = await supabase
                .from(this.entityName)
                .select('*', { count: 'exact', head: true })
                .eq('assignedTo', userId)
                .eq('clientId', clientId)
            // .eq('assignedTo.bot_enabled', false)
            // .is('deletedAt', null);

            if (countError) throw new errors.DBError(countError.message);

            // Return tickets with total count
            return { data: result, total: totalCount || 0 };
        } catch (error) {
            console.error('Error listing assigned tickets:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    async getUnassignedTickets(filters = {}) {
        try {
            const { status, workspaceId, clientId, priority, skip = 0, limit = 10, userId } = filters;

            // Get tickets with no assignedTo value
            // get all tickets from ticket_teams table
            // get all team ids for this user
            const { data: teamRows, error: teamIdsError } = await supabase
                .from('teamMembers')
                .select('*')
                .eq('user_id', userId);
            const team_ids = teamRows.map(team => team.team_id);
            // get all tickets from ticket_teams table
            const { data: ticketTeams, error: ticketTeamsError } = await supabase
                .from('ticket_teams')
                .select('ticket_id')
                .in('team_id', team_ids);
            const ticket_ids = ticketTeams.map(ticket => ticket.ticket_id);
            const { data: teamData, error: teamDataError } = await supabase
                .from('teams')
                .select('*')
                .in('id', team_ids);

            let query = supabase
                .from(this.entityName)
                .select(`
                    id, sno, title, description, status, priority, customerId, 
                    teamId, teams:teamId(id, name),
                    assignedTo, lastMessage, lastMessageAt, createdAt, updatedAt
                `)
                .is('assignedTo', null)
                .eq('clientId', clientId)
                .in('id', ticket_ids)
                .is('deletedAt', null)
                .order('updatedAt', { ascending: false });

            if (workspaceId) query = query.eq('workspaceId', workspaceId);
            if (status) query = query.eq('status', status);
            if (priority !== undefined) query = query.eq('priority', priority);

            const { data: tickets, error } = await query
                .order('createdAt', { ascending: false })
                .range(skip, skip + limit - 1);

            if (error) {
                console.error("Error fetching unassigned tickets:", error);
                throw error;
            }


            if (!tickets || tickets.length === 0) {
                return [];
            }

            // Extract customer IDs to fetch customer details
            const customerIds = tickets
                .map(ticket => ticket.customerId)
                .filter(id => id);


            // Fetch customer details
            let customerMap = {};
            if (customerIds.length > 0) {

                const { data: customers, error: customersError } = await supabase
                    .from('customers')
                    .select('id, firstname, lastname, email, phone')
                    .in('id', customerIds);

                if (customersError) {
                    console.error("Error in customers query:", customersError);
                    throw customersError;
                }


                customerMap = customers.reduce((map, customer) => {
                    map[customer.id] = customer;
                    return map;
                }, {});
            }

            // Fetch team details for tickets with teamId
            const teamIds = tickets
                .map(ticket => ticket.teamId)
                .filter(id => id);

            let teamMap = {};
            if (teamIds.length > 0) {
                const { data: teams, error: teamsError } = await supabase
                    .from('teams')
                    .select('id, name')
                    .in('id', teamIds);

                if (!teamsError && teams) {
                    teamMap = teams.reduce((map, team) => {
                        map[team.id] = team;
                        return map;
                    }, {});
                }
            }

            //Update notification for unassigned tickets
            const ticketIds = tickets.map(ticket => ticket.id);
            // console.log("ticketIds", ticketIds)
            for (const ticketId of ticketIds) {
                const { data: notifications, error: notificationsError } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('type', 'NEW_TICKET')
                    .eq('entity_id', ticketId)
                    .single();
                if (notificationsError) {
                    console.error("Error updating notifications:", notificationsError);
                }
                if (notifications) {
                    const { data: notificationRecipients, error: notificationRecipientsError } = await supabase
                }
                // console.log("notifications", notifications)
                if (notifications) {
                    await supabase
                        .from('notification_recipients')
                        .update({ is_read: true })
                        .eq('notification_id', notifications.id)
                        .eq('user_id', userId)

                }
            }

            // Build mapping of ticket -> teams for unassigned tickets
            const unassignedTicketIds = tickets.map(t => t.id);
            const { data: unassignedTicketTeams, error: unassignedTeamsErr } = await supabase
                .from('ticket_teams')
                .select('ticket_id, teams(id,name)')
                .in('ticket_id', unassignedTicketIds);
            if (unassignedTeamsErr) {
                console.error("Error fetching ticket teams (unassigned):", unassignedTeamsErr);
                throw unassignedTeamsErr;
            }
            const ticketTeamsMap = unassignedTicketTeams?.reduce((acc, row) => {
                if (!acc[row.ticket_id]) acc[row.ticket_id] = [];
                acc[row.ticket_id].push({ id: row.teams.id, name: row.teams.name });
                return acc;
            }, {}) || {};

            // Total count
            const { count: totalCount, error: totalCountError } = await supabase
                .from(this.entityName)
                .select('*', { count: 'exact', head: true })
                .is('assignedTo', null)
                .eq('clientId', clientId)
                .in('id', ticket_ids)

            // Format ticket response
            const result = tickets.map(ticket => {
                const priority = ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low';
                const customer = ticket.customerId ? customerMap[ticket.customerId] : null;
                const teamData = ticketTeamsMap[ticket.id] || [];

                return {
                    id: ticket.id,
                    sno: ticket.sno,
                    subject: ticket.title,
                    description: ticket.description,
                    status: ticket.status,
                    priority: priority,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,
                    isUnread: false,
                    hasNotification: false,
                    notificationType: null,
                    customerId: ticket.customerId,
                    teamIds: teamData.map(t => t.id),
                    teams: teamData,
                    teamId: ticket.teamId,
                    team: teamData,
                    assignedTo: null,
                    assignedToUser: null,
                    customer: customer ? {
                        id: customer.id,
                        name: `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || customer.email || 'Unknown',
                        email: customer.email,
                        phone: customer.phone
                    } : {}
                };
            });

            // Total count to response
            return { data: result, total: totalCount || 0 };
        } catch (error) {
            console.error('Error listing unassigned tickets:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    async listBotTickets(req) {
        try {

            // Get all users with bot_enabled=true
            const { data: botUsers, error: botError } = await supabase
                .from('users')
                .select('id')
                .eq('bot_enabled', true);

            if (botError) {
                console.error("Error fetching bot users:", botError);
                throw new errors.DBError(botError.message);
            }

            if (!botUsers || botUsers.length === 0) {
                // console.log("No bot users found");
                return [];
            }

            // Extract bot user IDs
            const botUserIds = botUsers.map(user => user.id);

            // Get tickets assigned to bot users
            let query = supabase
                .from(this.entityName)
                .select('*')
                .in('assignedTo', botUserIds)
                .match({ workspaceId: req.workspaceId, clientId: req.clientId });

            // Apply additional filters if provided
            if (req.status) query = query.eq('status', req.status);
            if (req.priority) {
                const priorityMap = { high: 2, medium: 1, low: 0 };
                const priorityValue = priorityMap[req.priority];
                if (priorityValue !== undefined) {
                    query = query.eq('priority', priorityValue);
                }
            }
            if (req.teamId) query = query.eq('teamId', req.teamId);
            if (req.typeId) query = query.eq('typeId', req.typeId);

            // Apply pagination
            const skip = parseInt(req.skip) || 0;
            const limit = parseInt(req.limit) || 10;

            // Apply sorting
            if (req.sort_by) {
                const order = (req.sort_order === 'desc') ? { ascending: false } : { ascending: true };
                query = query.order(req.sort_by, order);
            } else {
                // Default sort by createdAt descending
                query = query.order('createdAt', { ascending: false });
            }

            // Apply range if pagination is requested
            if (skip !== undefined && limit !== undefined) {
                query = query.range(skip, skip + limit - 1);
            }

            const { data: tickets, error } = await query;

            if (error) {
                console.error("Error fetching bot tickets:", error);
                throw new errors.DBError(error.message);
            }

            // Build ticket -> teams map for bot tickets
            const ticketIdsForTeams = tickets.map(t => t.id);
            const { data: botTicketTeams, error: botTeamsErr } = await supabase
                .from('ticket_teams')
                .select('ticket_id, teams(id,name)')
                .in('ticket_id', ticketIdsForTeams);
            if (botTeamsErr) throw new errors.DBError(botTeamsErr.message);
            const ticketTeamsMap = botTicketTeams?.reduce((acc, row) => {
                if (!acc[row.ticket_id]) acc[row.ticket_id] = [];
                acc[row.ticket_id].push({ id: row.teams.id, name: row.teams.name });
                return acc;
            }, {}) || {};

            // Use the same enrichment process as listTickets
            const enrichedTickets = await Promise.map(tickets, async (ticket) => {
                const { data: customers } = await supabase
                    .from('ticketCustomers')
                    .select(`
                        customerId, 
                        customers(
                            id, 
                            email, 
                            firstname, 
                            lastname, 
                            phone
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

                const { data: tagRows } = await supabase
                    .from('ticketTags')
                    .select('tags(id, name, color)')
                    .eq('ticketId', ticket.id);

                const formattedTags = tagRows?.map(tr => ({
                    id: tr.tags.id,
                    name: tr.tags.name,
                    color: tr.tags.color
                })) || [];

                // Fetch assignedTo user details if assignedTo exists
                let assignedToObj = null;
                if (ticket.assignedTo && typeof ticket.assignedTo === 'object') {
                    assignedToObj = {
                        id: ticket.assignedTo.id,
                        name: ticket.assignedTo.name,
                        email: ticket.assignedTo.email,
                        bot_enabled: ticket.assignedTo.bot_enabled
                    };
                } else if (ticket.assignedTo) {
                    const { data: user } = await supabase
                        .from('users')
                        .select('id, name, email')
                        .eq('id', ticket.assignedTo)
                        .single();
                    if (user) {
                        assignedToObj = { ...user };
                    }
                }

                // Fetch team details if teamId exists
                let teamData = null;
                if (ticket.teamId) {
                    const { data: team } = await supabase
                        .from('teams')
                        .select('id, name')
                        .eq('id', ticket.teamId)
                        .single();

                    if (team) {
                        teamData = team;
                    }
                }

                // Fetch ticket type data if typeId exists
                const ticketTypePromise = ticket.typeId
                    ? supabase.from('ticketTypes').select('id, name, type').eq('id', ticket.typeId)
                    : Promise.resolve({ data: null });

                const { data: ticketType } = await ticketTypePromise;

                const { count: messageCount } = await supabase
                    .from('conversations')
                    .select('*', { count: 'exact', head: true })
                    .match({ ticket_id: ticket.id });

                const primaryCustomer = customers?.[0]?.customers;
                const primaryCompany = companies?.[0]?.companies ||
                    (primaryCustomer?.company ? primaryCustomer.company : null);
                const recipientEmails = mentions?.map(m => m.users?.email).filter(Boolean) || [];

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
                        name: `${primaryCustomer?.firstname || ''} ${primaryCustomer?.lastname || ''}`.trim() || primaryCustomer?.email || 'Unknown',
                        email: primaryCustomer?.email,
                        phone: primaryCustomer?.phone
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

                    assignedTo: ticket.assignedTo,
                    assignedToUser: assignedToObj,

                    teamIds: (ticketTeamsMap[ticket.id] || []).map(t => t.id),
                    teams: ticketTeamsMap[ticket.id] || [],
                    // legacy single team fields kept for backward compatibility
                    teamId: ticket.teamId,
                    team: ticketTeamsMap[ticket.id] || [],

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

            // Add a count query for total bot tickets
            const { count: totalCount, error: countError } = await supabase
                .from(this.entityName)
                .select('*', { count: 'exact', head: true })
                .in('assignedTo', botUserIds)
                .match({ workspaceId: req.workspaceId, clientId: req.clientId });

            if (countError) throw new errors.DBError(countError.message);

            // Return tickets with total count
            return { data: enrichedTickets, total: totalCount || 0 };
        } catch (err) {
            console.error("Error in listBotTickets:", err);
            throw err;
        }
    }

    // Ticket Tags Methods using ticketTags table

    async getTicketTagsById(ticketId, workspaceId, clientId) {
        try {
            const { data: ticketTags, error } = await supabase
                .from('ticketTags')
                .select(`
                    tagId,
                    tags (
                        id,
                        name,
                        color
                    )
                `)
                .eq('ticketId', ticketId)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId);

            if (error) {
                throw new errors.DBError(error.message);
            }

            const tags = ticketTags?.map(tt => ({
                id: tt.tags.id,
                name: tt.tags.name,
                color: tt.tags.color
            })) || [];

            return {
                ticketId,
                tags,
                count: tags.length
            };
        } catch (err) {
            console.error("Error getting ticket tags:", err);
            throw err;
        }
    }

    async updateTicketTagsById(ticketId, tagIds, workspaceId, clientId, userId) {
        try {
            // Verify ticket exists
            const { data: ticket, error: ticketError } = await supabase
                .from('tickets')
                .select('id')
                .eq('id', ticketId)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .single();

            if (ticketError) {
                throw new errors.NotFound("Ticket not found");
            }

            // Delete all existing tags for this ticket
            const { error: deleteError } = await supabase
                .from('ticketTags')
                .delete()
                .eq('ticketId', ticketId)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId);

            if (deleteError) {
                throw new errors.DBError(deleteError.message);
            }

            // Insert new tags if any
            if (tagIds && tagIds.length > 0) {
                const tagEntries = tagIds.map(tagId => ({
                    ticketId,
                    tagId,
                    workspaceId,
                    clientId,
                    createdAt: new Date().toISOString(),
                }));

                const { error: insertError } = await supabase
                    .from('ticketTags')
                    .insert(tagEntries);

                if (insertError) {
                    throw new errors.DBError(insertError.message);
                }
            }

            // Return updated tags
            return await this.getTicketTagsById(ticketId, workspaceId, clientId);
        } catch (err) {
            console.error("Error updating ticket tags:", err);
            throw err;
        }
    }

    async getTicketTeamsById(ticketId, workspaceId, clientId) {
        try {
            const { data: ticketTeams, error } = await supabase
                .from('ticket_teams')
                .select(`
                    team_id,
                    teams (
                        id,
                        name
                    )
                `)
                .eq('ticket_id', ticketId)
                .eq('workspace_id', workspaceId)
                .eq('client_id', clientId);

            if (error) {
                throw new errors.DBError(error.message);
            }

            const teams = ticketTeams?.map(tt => ({
                id: tt.teams.id,
                name: tt.teams.name
            })) || [];

            return {
                ticketId,
                teams,
                count: teams.length
            };
        } catch (err) {
            console.error("Error getting ticket teams:", err);
            throw err;
        }
    }

    async updateTicketTeamsById(ticketId, teamIds, workspaceId, clientId, userId) {
        try {
            // Verify ticket exists
            const { data: ticket, error: ticketError } = await supabase
                .from('tickets')
                .select('id')
                .eq('id', ticketId)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .single();

            if (ticketError) {
                throw new errors.NotFound("Ticket not found");
            }

            // Delete existing team mappings for this ticket
            const { error: deleteError } = await supabase
                .from('ticket_teams')
                .delete()
                .eq('ticket_id', ticketId)
                .eq('workspace_id', workspaceId)
                .eq('client_id', clientId);

            if (deleteError) {
                throw new errors.DBError(deleteError.message);
            }

            // Insert new team mappings if provided
            if (teamIds && teamIds.length > 0) {
                const teamEntries = teamIds.map(teamId => ({
                    ticket_id: ticketId,
                    team_id: teamId,
                    workspace_id: workspaceId,
                    client_id: clientId,
                    created_at: new Date().toISOString(),
                }));

                const { error: insertError } = await supabase
                    .from('ticket_teams')
                    .insert(teamEntries);

                if (insertError) {
                    throw new errors.DBError(insertError.message);
                }
            }

            // Return updated list of teams
            return await this.getTicketTeamsById(ticketId, workspaceId, clientId);
        } catch (err) {
            console.error("Error updating ticket teams:", err);
            throw err;
        }
    }
}

module.exports = TicketService;
