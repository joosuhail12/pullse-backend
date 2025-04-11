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
            const { ticketId, userId, clientId, status, isRead, skip = 0, limit = 10 } = filters;

            console.log("Filtering with params:", { ticketId, userId, clientId, status, isRead });

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
                .select('id, title, status, priority, customerId, clientId, sno, createdAt, updatedAt')
                .in('id', ticketIds);

            // Apply filters on tickets
            if (status) {
                ticketQuery = ticketQuery.eq('status', status);
            }

            if (clientId) {
                ticketQuery = ticketQuery.eq('clientId', clientId);
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

            // Create a lookup map for ticket data
            const ticketMap = {};
            tickets.forEach(ticket => {
                const priority = ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low';
                const customer = ticket.customerId ? customerMap[ticket.customerId] : null;

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
                    customer: customer ? {
                        id: customer.id,
                        name: `${customer.firstname} ${customer.lastname}`.trim() || customer.email,
                        email: customer.email,
                        phone: customer.phone,
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

                return {
                    id: mention.id,
                    ticketId: mention.ticketId,
                    userId: mention.userId,
                    content: mention.content,
                    mentionedAt: mention.mentionedAt,
                    isRead: mention.isRead,
                    mentionedBy: mention.mentionedBy,
                    ticket: ticket,
                    mentioner
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