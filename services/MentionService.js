const Promise = require("bluebird");
const errors = require("../errors");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class MentionService {
    constructor() {
        this.entityName = "ticket_mentions";
    }

    async mentionUser(ticketId, userId, mentionedBy, content = '') {
        try {
            const { data, error } = await supabase
                .from(this.entityName)
                .insert({
                    ticketId,
                    userId,
                    mentionedBy,
                    content,
                    mentionedAt: new Date()
                })
                .select();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error adding mention:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    async getUserMentions(filters = {}) {
        try {
            const { ticketId, userId, clientId, status, isRead, skip = 0, limit = 10, workspaceId } = filters;

            console.log("Filtering with params:", { ticketId, userId, clientId, status, isRead, workspaceId });

            // Build the query to get mentions
            let query = supabase
                .from(this.entityName)
                .select('*');

            // Apply direct filters on mentions table
            if (userId) {
                // This is filtering for mentions where the specified user is mentioned
                query = query.eq('userId', userId);
                console.log(`Filtering by userId: ${userId}`);
            }

            if (ticketId) {
                query = query.eq('ticketId', ticketId);
                console.log(`Filtering by ticketId: ${ticketId}`);
            }

            if (isRead !== undefined) {
                query = query.eq('isRead', isRead);
                console.log(`Filtering by isRead: ${isRead}`);
            }

            const { data: mentions, error } = await query
                .order('mentionedAt', { ascending: false })
                .range(skip, skip + limit - 1);

            if (error) {
                console.error("Error in mentions query:", error);
                throw error;
            }

            console.log(`Found ${mentions ? mentions.length : 0} mentions`);

            if (!mentions || mentions.length === 0) {
                return [];
            }

            // Extract ticket IDs to fetch associated tickets
            const ticketIds = mentions.map(mention => mention.ticketId);

            // Fetch tickets with filtering
            let ticketQuery = supabase
                .from('tickets')
                .select('id, title, status, priority, customerId, clientId, sno, createdAt, updatedAt, assignedTo, teamId')
                .in('id', ticketIds);

            // Apply filters on tickets
            if (status) {
                ticketQuery = ticketQuery.eq('status', status);
            }

            if (clientId) {
                ticketQuery = ticketQuery.eq('clientId', clientId);
            }

            if (workspaceId) {
                ticketQuery = ticketQuery.eq('workspaceId', workspaceId);
            }

            const { data: tickets, error: ticketsError } = await ticketQuery;

            if (ticketsError) {
                console.error("Error in tickets query:", ticketsError);
                throw ticketsError;
            }

            console.log(`Found ${tickets ? tickets.length : 0} associated tickets`);

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

            // Extract assignedTo user IDs to fetch assignedTo user details
            const assignedToUserIds = tickets
                .map(ticket => ticket.assignedTo)
                .filter(id => id);

            // Fetch assignedTo user details
            let assignedToUserMap = {};
            if (assignedToUserIds.length > 0) {
                const { data: assignedToUsers, error: assignedToUsersError } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .in('id', assignedToUserIds);

                if (assignedToUsersError) {
                    console.error("Error in assignedToUsers query:", assignedToUsersError);
                    throw assignedToUsersError;
                }

                assignedToUserMap = assignedToUsers.reduce((map, user) => {
                    map[user.id] = user;
                    return map;
                }, {});
            }

            // Extract team IDs to fetch team details
            const teamIds = tickets
                .map(ticket => ticket.teamId)
                .filter(id => id);

            // Fetch team details
            let teamMap = {};
            if (teamIds.length > 0) {
                const { data: teams, error: teamsError } = await supabase
                    .from('teams')
                    .select('id, name')
                    .in('id', teamIds);

                if (teamsError) {
                    console.error("Error in teams query:", teamsError);
                    throw teamsError;
                }

                teamMap = teams.reduce((map, team) => {
                    map[team.id] = team;
                    return map;
                }, {});
            }

            // Extract assigneeId values to fetch assignedBy user details
            const assigneeIds = tickets
                .map(ticket => ticket.assigneeId)
                .filter(id => id);

            // Fetch assignedBy user details
            let assignedByUserMap = {};
            if (assigneeIds.length > 0) {
                const { data: assignedByUsers, error: assignedByUsersError } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .in('id', assigneeIds);

                if (assignedByUsersError) {
                    console.error("Error in assignedByUsers query:", assignedByUsersError);
                    throw assignedByUsersError;
                }

                assignedByUserMap = assignedByUsers.reduce((map, user) => {
                    map[user.id] = user;
                    return map;
                }, {});
            }

            // Create a lookup map for ticket data
            const ticketMap = {};
            tickets.forEach(ticket => {
                const priority = ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low';
                const customer = ticket.customerId ? customerMap[ticket.customerId] : null;
                const assignedToUser = ticket.assignedTo ? assignedToUserMap[ticket.assignedTo] : null;
                const team = ticket.teamId ? teamMap[ticket.teamId] : null;

                ticketMap[ticket.id] = {
                    id: ticket.id,
                    title: ticket.title,
                    sno: ticket.sno,
                    status: ticket.status,
                    priority: priority,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,
                    clientId: ticket.clientId,
                    isUnread: false, // Default value, update if needed
                    hasNotification: false, // Default value, update if needed
                    notificationType: null, // Default value, update if needed
                    customerId: ticket.customerId,
                    teamId: ticket.teamId,
                    assignedTo: ticket.assignedTo,
                    // createdBy: ticket.createdBy,
                    // updatedBy: ticket.updatedBy,
                    // createdAt: ticket.createdAt,
                    // updatedAt: ticket.updatedAt,
                    customer: customer ? {
                        id: customer.id,
                        name: `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || customer.email || 'Unknown',
                        email: customer.email,
                        phone: customer.phone,
                    } : null,
                    assignedToUser: assignedToUser ? {
                        id: assignedToUser.id,
                        name: assignedToUser.name,
                        email: assignedToUser.email
                    } : null,
                    team: team ? {
                        id: team.id,
                        name: team.name
                    } : null
                };
            });

            // Fetch mentioner data
            const mentionerIds = mentions
                .map(mention => mention.mentionedBy)
                .filter(id => id);

            let mentionerMap = {};
            if (mentionerIds.length > 0) {
                const { data: mentioners, error: mentionersError } = await supabase
                    .from('users')
                    .select('id, name, email')
                    .in('id', mentionerIds);

                if (mentionersError) {
                    console.error("Error in mentioners query:", mentionersError);
                    throw mentionersError;
                }

                mentionerMap = mentioners.reduce((map, user) => {
                    map[user.id] = user;
                    return map;
                }, {});
            }

            // Join the data manually
            const enrichedMentions = mentions.map(mention => {
                const ticket = ticketMap[mention.ticketId] || null;
                const mentioner = mention.mentionedBy ? mentionerMap[mention.mentionedBy] : null;
                const primaryCustomer = ticket?.customer || null;
                const primaryCompany = ticket?.company || null;
                const assignees = ticket?.assignees || null;
                const teamData = ticket?.team || null;
                const ticketType = ticket?.type || null;
                const messageCount = ticket?.messageCount || 0;
                const assigneeStatus = assignees?.[0]?.users ? 'Assigned' : 'Unassigned';
                const assignedToUser = ticket?.assignedToUser || null;
                const formattedTags = ticket?.tags || null;
                const recipientEmails = ticket?.recipients || null;

                // Add assignedBy data from assigneeId
                const assignedByUser = ticket.assigneeId ? assignedByUserMap[ticket.assigneeId] : null;

                return {
                    id: mention.id,
                    ticketId: mention.ticketId,
                    userId: mention.userId,
                    content: mention.content,
                    mentionedAt: mention.mentionedAt,
                    isRead: mention.isRead,
                    mentionedBy: mention.mentionedBy,
                    ticket: ticket,
                    createdBy: ticket.createdBy,
                    updatedBy: ticket.updatedBy,
                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,

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
                    assigneeStatus: assigneeStatus,

                    assignedTo: ticket.assignedTo,
                    assignedToUser: assignedToUser ? {
                        id: assignedToUser.id,
                        name: assignedToUser.name,
                        email: assignedToUser.email
                    } : null,

                    teamId: ticket.teamId,
                    team: teamData ? {
                        id: teamData.id,
                        name: teamData.name
                    } : null,

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
                    reopenInfo: ticket.reopen || null,

                    // Add assignedBy information to the response
                    assignedBy: assignedByUser ? {
                        id: assignedByUser.id,
                        name: assignedByUser.name,
                        email: assignedByUser.email
                    } : null,
                };
            }).filter(mention => mention.ticket !== null); // Only return mentions with valid tickets

            console.log(`Returning ${enrichedMentions.length} enriched mentions`);
            return enrichedMentions;
        } catch (error) {
            console.error('Error fetching user mentions:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    async markAsRead(mentionId, userId) {
        try {
            const { data, error } = await supabase
                .from(this.entityName)
                .update({ isRead: true })
                .eq('id', mentionId)
                .eq('userId', userId)
                .select();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error marking mention as read:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    async updateMention(mentionId, updateData) {
        try {
            // Allow updating these fields if provided
            const allowedFields = ['content', 'isRead', 'ticketId', 'userId', 'mentionedBy'];
            const updateObj = {};

            // Only allow specific fields to be updated
            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateObj[key] = updateData[key];
                }
            });

            // Add updated_at timestamp
            updateObj.updated_at = new Date();

            console.log(`Updating mention ${mentionId} with fields:`, updateObj);

            // Update the mention
            const { data, error } = await supabase
                .from(this.entityName)
                .update(updateObj)
                .eq('id', mentionId)
                .select();

            if (error) {
                console.error("Supabase update error:", error);
                throw error;
            }

            if (!data || data.length === 0) {
                throw new errors.NotFound(`Mention with ID ${mentionId} not found`);
            }

            return data[0];
        } catch (error) {
            console.error('Error updating mention:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    handleError(error) {
        console.log(error);
        if (error.code === "PGRST116") {
            return new errors.NotFound(`${this.entityName} not found.`);
        }
        return error;
    }
}

module.exports = MentionService; 