const BaseService = require('./BaseService');
const _ = require('lodash');
const errors = require('../errors');

class TimelineService extends BaseService {
    constructor() {
        super('timeline');
        this.listingFields = [
            'id', 'entity_type', 'entity_id', 'activity_type', 'activity_subtype',
            'title', 'description', 'summary', 'related_ticket_id', 'related_email_id',
            'related_note_id', 'related_call_id', 'related_meeting_id', 'related_conversation_id',
            'field_changed', 'changes_summary', 'actor_id', 'actor_name', 'actor_type', 'actor_email',
            'source', 'priority', 'is_internal', 'response_time_minutes', 'activity_date', 'created_at'
        ];
        this.updatableFields = ['title', 'description', 'summary', 'is_internal', 'deleted_at'];
    }

    /**
     * Get activity timeline for contact/company with filtering
     * This matches your frontend dropdown requirements
     */
    async getEntityTimeline(entityType, entityId, workspaceId, clientId, filters = {}) {
        try {
            let query = this.supabase
                .from(this.entityName)
                .select(this.listingFields.join(', '))
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .eq('workspace_id', workspaceId)
                .eq('client_id', clientId)
                .is('deleted_at', null);

            // Apply activity type filter (from dropdown)
            if (filters.activity_type && filters.activity_type !== 'all') {
                query = query.eq('activity_type', filters.activity_type);
            }

            // Apply date range filters
            if (filters.date_from) {
                query = query.gte('activity_date', filters.date_from);
            }
            if (filters.date_to) {
                query = query.lte('activity_date', filters.date_to);
            }

            // Apply actor filter
            if (filters.actor_id) {
                query = query.eq('actor_id', filters.actor_id);
            }

            // Exclude internal activities for external users
            if (filters.exclude_internal) {
                query = query.eq('is_internal', false);
            }

            // Apply pagination
            const limit = parseInt(filters.limit) || 50;
            const offset = parseInt(filters.offset) || 0;

            query = query
                .order('activity_date', { ascending: false })
                .range(offset, offset + limit - 1);

            const { data, error } = await query;
            if (error) throw error;

            // Enrich data with related information
            return await this.enrichTimelineData(data || []);
        } catch (err) {
            return this.handleError(err);
        }
    }

    /**
     * Get timeline statistics for the dropdown counts
     */
    async getTimelineStats(entityType, entityId, workspaceId, clientId, dateRange = null) {
        try {
            let query = this.supabase
                .from(this.entityName)
                .select('activity_type, response_time_minutes')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .eq('workspace_id', workspaceId)
                .eq('client_id', clientId)
                .is('deleted_at', null);

            if (dateRange) {
                if (dateRange.from) query = query.gte('activity_date', dateRange.from);
                if (dateRange.to) query = query.lte('activity_date', dateRange.to);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Calculate stats
            const stats = {
                total_interactions: data.length,
                avg_response_time_minutes: 0,
                activity_counts: {
                    email: 0,
                    ticket: 0,
                    note: 0,
                    call: 0,
                    meeting: 0,
                    company_update: 0,
                    contact_update: 0
                },
                most_frequent_activity: 'email'
            };

            // Process the data
            const responseTimes = [];
            data.forEach(item => {
                if (stats.activity_counts.hasOwnProperty(item.activity_type)) {
                    stats.activity_counts[item.activity_type]++;
                }
                if (item.response_time_minutes) {
                    responseTimes.push(item.response_time_minutes);
                }
            });

            // Calculate average response time
            if (responseTimes.length > 0) {
                stats.avg_response_time_minutes = Math.round(
                    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
                );
            }

            // Find most frequent activity
            const maxCount = Math.max(...Object.values(stats.activity_counts));
            stats.most_frequent_activity = Object.keys(stats.activity_counts)
                .find(key => stats.activity_counts[key] === maxCount) || 'email';

            return stats;
        } catch (err) {
            return this.handleError(err);
        }
    }

    /**
     * Create timeline entries for different activity types
     */

    // Email activity
    async logEmailActivity(entityType, entityId, emailData, workspaceId, clientId) {
        return this.createEntry({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: 'email',
            activity_subtype: emailData.direction, // 'sent' or 'received'
            title: emailData.subject || 'Email',
            summary: `${emailData.direction === 'sent' ? 'Sent' : 'Received'} email: ${emailData.subject}`,
            description: emailData.preview,
            related_email_id: emailData.email_id,
            actor_id: emailData.actor_id,
            actor_name: emailData.actor_name,
            actor_type: emailData.actor_type || 'user',
            actor_email: emailData.actor_email,
            workspace_id: workspaceId,
            client_id: clientId,
            source: 'email',
            response_time_minutes: emailData.response_time_minutes,
            activity_date: emailData.sent_at || new Date()
        });
    }

    // Ticket activity
    async logTicketActivity(entityType, entityId, ticketData, workspaceId, clientId) {
        let title, summary;

        switch (ticketData.action) {
            case 'created':
                title = `Created support ticket #${ticketData.ticket_number}`;
                summary = `Support ticket #${ticketData.ticket_number} was created`;
                break;
            case 'updated':
                title = `Updated ticket #${ticketData.ticket_number}`;
                summary = `Ticket #${ticketData.ticket_number} was updated`;
                break;
            case 'closed':
                title = `Closed ticket #${ticketData.ticket_number}`;
                summary = `Ticket #${ticketData.ticket_number} was closed`;
                break;
            default:
                title = `Ticket #${ticketData.ticket_number} ${ticketData.action}`;
                summary = title;
        }

        return this.createEntry({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: 'ticket',
            activity_subtype: ticketData.action,
            title: title,
            summary: summary,
            description: ticketData.description,
            related_ticket_id: ticketData.ticket_id,
            field_changed: ticketData.field_changed,
            changes_summary: ticketData.changes_summary,
            actor_id: ticketData.actor_id,
            actor_name: ticketData.actor_name,
            actor_type: ticketData.actor_type || 'user',
            workspace_id: workspaceId,
            client_id: clientId,
            source: ticketData.source || 'web',
            priority: ticketData.priority || 'normal',
            activity_date: ticketData.activity_date || new Date()
        });
    }

    // Contact/Company update activity
    async logEntityUpdateActivity(entityType, entityId, updateData, workspaceId, clientId) {
        const entityName = entityType === 'contact' ? 'contact' : 'company';

        return this.createEntry({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: `${entityType}_update`,
            activity_subtype: 'updated',
            title: `Updated ${entityName} information`,
            summary: `${entityName.charAt(0).toUpperCase() + entityName.slice(1)} information was updated`,
            description: updateData.changes_summary,
            field_changed: updateData.fields_changed?.join(', '),
            changes_summary: updateData.changes_summary,
            actor_id: updateData.actor_id,
            actor_name: updateData.actor_name,
            actor_type: updateData.actor_type || 'user',
            workspace_id: workspaceId,
            client_id: clientId,
            source: updateData.source || 'web',
            activity_date: updateData.activity_date || new Date()
        });
    }

    // Note activity
    async logNoteActivity(entityType, entityId, noteData, workspaceId, clientId) {
        return this.createEntry({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: 'note',
            activity_subtype: 'added',
            title: 'Added new note',
            summary: `Added note: ${noteData.title || noteData.content?.substring(0, 50) + '...'}`,
            description: noteData.content,
            related_note_id: noteData.note_id,
            actor_id: noteData.actor_id,
            actor_name: noteData.actor_name,
            actor_type: noteData.actor_type || 'user',
            workspace_id: workspaceId,
            client_id: clientId,
            source: noteData.source || 'web',
            is_internal: noteData.is_internal || false,
            activity_date: noteData.created_at || new Date()
        });
    }

    /**
     * Enrich timeline data with related record information
     */
    async enrichTimelineData(timelineData) {
        if (!timelineData.length) return [];

        // Group by related record types for batch fetching
        const ticketIds = timelineData.filter(item => item.related_ticket_id).map(item => item.related_ticket_id);
        const emailIds = timelineData.filter(item => item.related_email_id).map(item => item.related_email_id);

        // Fetch related data in parallel
        const [ticketsData, emailsData] = await Promise.all([
            ticketIds.length ? this.fetchTicketData(ticketIds) : [],
            emailIds.length ? this.fetchEmailData(emailIds) : []
        ]);

        // Create lookup maps
        const ticketsMap = new Map(ticketsData.map(ticket => [ticket.id, ticket]));
        const emailsMap = new Map(emailsData.map(email => [email.id, email]));

        // Enrich timeline entries
        return timelineData.map(entry => ({
            ...entry,
            related_ticket: entry.related_ticket_id ? ticketsMap.get(entry.related_ticket_id) : null,
            related_email: entry.related_email_id ? emailsMap.get(entry.related_email_id) : null,
            // Format date for frontend
            formatted_date: this.formatActivityDate(entry.activity_date),
            time_ago: this.getTimeAgo(entry.activity_date)
        }));
    }

    /**
     * Helper methods
     */
    async fetchTicketData(ticketIds) {
        if (!ticketIds.length) return [];

        const { data, error } = await this.supabase
            .from('tickets')
            .select('id, sno, title, status, priority')
            .in('id', ticketIds);

        return error ? [] : data;
    }

    async fetchEmailData(emailIds) {
        // Implement based on your email table structure
        // This is a placeholder - you may have conversations table or separate email table
        if (!emailIds.length) return [];

        const { data, error } = await this.supabase
            .from('conversations')
            .select('id, message, type, createdAt')
            .in('id', emailIds)
            .eq('type', 'email');

        return error ? [] : data;
    }

    formatActivityDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 1) {
            return 'less than a minute ago';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
        } else if (diffInMinutes < 1440) { // 24 hours
            const hours = Math.floor(diffInMinutes / 60);
            return `${hours} hour${hours === 1 ? '' : 's'} ago`;
        } else if (diffInMinutes < 43200) { // 30 days
            const days = Math.floor(diffInMinutes / 1440);
            return `${days} day${days === 1 ? '' : 's'} ago`;
        } else {
            const months = Math.floor(diffInMinutes / 43200);
            return `about ${months} month${months === 1 ? '' : 's'} ago`;
        }
    }

    getTimeAgo(dateString) {
        return this.formatActivityDate(dateString);
    }

    /**
     * Base create method with validation
     */
    async createEntry(data) {
        try {
            const requiredFields = ['entity_type', 'entity_id', 'activity_type', 'workspace_id', 'client_id'];
            const missingFields = requiredFields.filter(field => !data[field]);

            if (missingFields.length > 0) {
                throw new errors.BadRequest(`Missing required fields: ${missingFields.join(', ')}`);
            }

            const { data: result, error } = await this.supabase
                .from(this.entityName)
                .insert(data)
                .select()
                .single();

            if (error) throw error;
            return result;
        } catch (err) {
            return this.handleError(err);
        }
    }

    /**
     * Get workspace-wide timeline (missing method)
     */
    async getWorkspaceTimeline(workspaceId, clientId, filters = {}, options = {}) {
        try {
            let query = this.supabase
                .from(this.entityName)
                .select(this.listingFields.join(', '))
                .eq('workspace_id', workspaceId)
                .eq('client_id', clientId)
                .is('deleted_at', null);

            // Apply filters
            if (filters.entity_type) {
                query = query.eq('entity_type', filters.entity_type);
            }
            if (filters.activity_type) {
                query = query.eq('activity_type', filters.activity_type);
            }
            if (filters.actor_id) {
                query = query.eq('actor_id', filters.actor_id);
            }
            if (filters.date_from) {
                query = query.gte('activity_date', filters.date_from);
            }
            if (filters.date_to) {
                query = query.lte('activity_date', filters.date_to);
            }

            // Apply pagination and sorting
            const limit = options.limit || 100;
            const offset = options.offset || 0;
            query = query
                .order('activity_date', { ascending: false })
                .range(offset, offset + limit - 1);

            const { data, error } = await query;
            if (error) throw error;

            return await this.enrichTimelineData(data || []);
        } catch (err) {
            return this.handleError(err);
        }
    }

    /**
     * Helper method to track field changes (FIXED: Made static)
     */
    static trackChanges(oldData, newData, fieldsToTrack = []) {
        const changes = {};

        fieldsToTrack.forEach(field => {
            if (oldData[field] !== newData[field]) {
                changes[field] = {
                    old: oldData[field],
                    new: newData[field]
                };
            }
        });

        return Object.keys(changes).length > 0 ? changes : null;
    }

    /**
     * Helper methods for common timeline entries
     */
    async logEntityCreated(entityType, entityId, workspaceId, clientId, userId, userName, additionalData = {}) {
        return this.createEntry({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: entityType === 'contact' ? 'contact_update' : entityType === 'company' ? 'company_update' : 'ticket',
            activity_subtype: 'created',
            title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} was created`,
            summary: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} was created`,
            workspace_id: workspaceId,
            client_id: clientId,
            actor_id: userId,
            actor_name: userName,
            actor_type: 'user',
            source: additionalData.source || 'web',
            ...additionalData
        });
    }

    async logEntityUpdated(entityType, entityId, changes, workspaceId, clientId, userId, userName, additionalData = {}) {
        const changesSummary = Object.keys(changes).join(', ');
        return this.createEntry({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: entityType === 'contact' ? 'contact_update' : entityType === 'company' ? 'company_update' : 'ticket',
            activity_subtype: 'updated',
            title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} was updated`,
            summary: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} was updated (${changesSummary})`,
            changes_summary: changesSummary,
            field_changed: Object.keys(changes).join(', '),
            workspace_id: workspaceId,
            client_id: clientId,
            actor_id: userId,
            actor_name: userName,
            actor_type: 'user',
            source: additionalData.source || 'web',
            ...additionalData
        });
    }
}

module.exports = TimelineService; 