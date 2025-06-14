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
            'field_changed', 'changes_summary', 'old_value', 'new_value', 'actor_id', 'actor_name', 'actor_type', 'actor_email',
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
                // query = query.eq('activity_type', filters.activity_type);
                // Map frontend activity type to database activity type
                const dbActivityType = this.mapActivityTypeToDatabase(filters.activity_type, entityType);
                query = query.eq('activity_type', dbActivityType);
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

            // Enrich data with comprehensive information for frontend
            return await this.enrichTimelineDataForFrontend(data || [], { entityType, entityId, workspaceId, clientId });
        } catch (err) {
            return this.handleError(err);
        }
    }

    /**
     * Map frontend activity type to database activity type
     * This handles the difference between what users see in filters vs what's stored in DB
     */
    mapActivityTypeToDatabase(frontendActivityType, entityType) {
        // Based on the database, ticket activities are stored as 'ticket', not 'ticket_update'
        // So no mapping is needed - return the frontend type as-is
        return frontendActivityType;
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
                    contact_update: 0,
                    sentiment_update: 0,
                    tag_update: 0
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
        let title, summary, description;

        // Fetch actual ticket details if ticket_id is provided
        let ticketDetails = null;
        if (ticketData.ticket_id) {
            try {
                const { data, error } = await this.supabase
                    .from('tickets')
                    .select('id, sno, title, description, status, priority')
                    .eq('id', ticketData.ticket_id)
                    .single();

                if (!error && data) {
                    ticketDetails = data;
                }
            } catch (err) {
                console.error('Error fetching ticket details for timeline:', err);
            }
        }
        console.log('🔧 DEBUG: Ticket data:', ticketData);
        console.log('🔧 DEBUG: Ticket details:', ticketDetails);

        // Use ticket details first, fallback to ticket data
        const ticketTitle = ticketDetails?.title || 'Ticket';
        const ticketNumber = ticketDetails?.sno || 'Unknown';

        switch (ticketData.action) {
            case 'created':
                title = `Created support ticket #${ticketTitle}`;
                summary = `Support ticket #${ticketNumber}: ${ticketTitle}`;
                description = ticketDetails?.description || ticketData.description || ticketTitle;
                break;
            case 'updated':
                title = `Updated ticket #${ticketTitle}`;
                summary = ticketData.changes_summary || `Ticket #${ticketNumber} was updated: ${ticketTitle}`;
                description = ticketData.changes_summary || ticketDetails?.description || ticketTitle;
                break;
            case 'closed':
                title = `Closed ticket #${ticketTitle}`;
                summary = `Closed ticket #${ticketNumber}: ${ticketTitle}`;
                description = ticketDetails?.description || ticketTitle;
                break;
            default:
                title = `Ticket #${ticketTitle}`;
                summary = `Ticket #${ticketNumber}: ${ticketTitle}`;
                description = ticketDetails?.description || ticketTitle;
        }

        console.log('🔧 DEBUG: Final values:', { title, summary, description, ticketTitle, ticketNumber });

        // Fetch actual user name if actor_id is provided
        const actorName = ticketData.actor_name || await this.getUserName(ticketData.actor_id);

        // Extract actual field names that were changed
        let changedFieldNames = ticketData.field_changed || '';
        if (ticketData.old_value && ticketData.old_value.fields_updated) {
            changedFieldNames = ticketData.old_value.fields_updated.map(field => field.field_name).join(', ');
        }

        const entryData = TimelineService.createTimelineEntryData({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: 'ticket_update',
            activity_subtype: ticketData.action,
            title: title,
            summary: summary,
            description: description,
            related_ticket_id: ticketData.ticket_id,
            field_changed: changedFieldNames, // Only actual field names
            changes_summary: ticketData.changes_summary,
            old_value: ticketData.old_value || null, // Structured old value data
            new_value: ticketData.new_value || null, // Structured new value data
            actor_id: ticketData.actor_id,
            actor_name: actorName,
            actor_type: ticketData.actor_type || 'user',
            workspace_id: workspaceId,
            client_id: clientId,
            source: ticketData.source || 'web',
            priority: ticketDetails?.priority || ticketData.priority || 'normal',
            activity_date: ticketData.activity_date || new Date()
        });

        return this.createEntry(entryData);
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
            actor_name: getUserName(updateData.actor_id),
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
     * Enrich timeline data with comprehensive information for frontend display
     */
    async enrichTimelineDataForFrontend(timelineData, context = {}) {
        if (!timelineData.length) return [];

        // Group by related record types for batch fetching
        const ticketIds = timelineData.filter(item => item.related_ticket_id).map(item => item.related_ticket_id);
        const emailIds = timelineData.filter(item => item.related_email_id).map(item => item.related_email_id);
        const actorIds = timelineData.filter(item => item.actor_id).map(item => item.actor_id);

        // Fetch related data in parallel
        const [ticketsData, emailsData, actorsData] = await Promise.all([
            ticketIds.length ? this.fetchEnhancedTicketData(ticketIds) : [],
            emailIds.length ? this.fetchEnhancedEmailData(emailIds) : [],
            actorIds.length ? this.fetchEnhancedActorData(actorIds) : []
        ]);

        // Create lookup maps
        const ticketsMap = new Map(ticketsData.map(ticket => [ticket.id, ticket]));
        const emailsMap = new Map(emailsData.map(email => [email.id, email]));
        const actorsMap = new Map(actorsData.map(actor => [actor.id, actor]));

        // Enrich timeline entries with comprehensive data
        return timelineData.map(entry => {
            const enrichedEntry = {
                ...entry,

                // Enhanced actor information
                actor: this.enhanceActorInfo(entry, actorsMap),

                // Related record data
                related_ticket: entry.related_ticket_id ? ticketsMap.get(entry.related_ticket_id) : null,
                related_email: entry.related_email_id ? emailsMap.get(entry.related_email_id) : null,

                // Enhanced change information
                changes_detail: this.formatChangesForFrontend(entry),

                // Time formatting
                formatted_date: this.formatActivityDate(entry.activity_date),
                time_ago: this.getTimeAgo(entry.activity_date),
                date_group: this.getDateGroup(entry.activity_date),

                // Activity categorization
                activity_category: this.getActivityCategory(entry.activity_type),
                activity_icon: this.getActivityIcon(entry.activity_type, entry.activity_subtype),
                activity_color: this.getActivityColor(entry.activity_type),

                // Display information
                display_title: this.getDisplayTitle(entry),
                display_summary: this.getDisplaySummary(entry),
                display_description: this.getDisplayDescription(entry),

                // Metadata for frontend
                can_edit: entry.activity_type === 'note' || entry.is_internal,
                can_delete: entry.activity_type === 'note' || entry.is_internal,
                importance_level: this.getImportanceLevel(entry),

                // Context information
                entity_context: context
            };

            return enrichedEntry;
        });
    }

    /**
     * Enhanced ticket data fetching with additional context
     */
    async fetchEnhancedTicketData(ticketIds) {
        if (!ticketIds.length) return [];

        const { data, error } = await this.supabase
            .from('tickets')
            .select(`
                id, sno, title, status, priority, description, channel,
                customerId, assignedTo, assigneeId, teamId, typeId,
                createdAt, updatedAt, closedAt, lastMessageAt,
                teams:teamId(id, name),
                ticketTypes:typeId(id, name),
                assignee:assigneeId(id, name, email)
            `)
            .in('id', ticketIds);

        return error ? [] : (data || []).map(ticket => ({
            ...ticket,
            url: `/tickets/${ticket.id}`,
            display_id: `#${ticket.sno}`,
            status_color: this.getTicketStatusColor(ticket.status),
            priority_color: this.getTicketPriorityColor(ticket.priority)
        }));
    }

    /**
     * Enhanced email data fetching 
     */
    async fetchEnhancedEmailData(emailIds) {
        if (!emailIds.length) return [];

        const { data, error } = await this.supabase
            .from('conversations')
            .select(`
                id, subject, message, type, direction, messageType,
                createdAt, fromEmail, toEmail, ccEmail, bccEmail,
                attachments, isRead, customerId
            `)
            .in('id', emailIds)
            .eq('type', 'email');

        return error ? [] : (data || []).map(email => ({
            ...email,
            preview: email.message ? email.message.substring(0, 150) + '...' : '',
            url: `/conversations/${email.id}`,
            direction_icon: email.direction === 'sent' ? 'send' : 'receive'
        }));
    }

    /**
     * Enhanced actor data fetching
     */
    async fetchEnhancedActorData(actorIds) {
        if (!actorIds.length) return [];

        const { data, error } = await this.supabase
            .from('users')
            .select('id, name, fName, lName, email, avatar, role, status')
            .in('id', actorIds);

        return error ? [] : (data || []).map(actor => ({
            ...actor,
            display_name: actor.name || `${actor.fName || ''} ${actor.lName || ''}`.trim() || 'User',
            initials: this.getInitials(actor.name || `${actor.fName || ''} ${actor.lName || ''}`),
            avatar_url: actor.avatar || null
        }));
    }

    /**
     * Enhance actor information
     */
    enhanceActorInfo(entry, actorsMap) {
        if (!entry.actor_id) {
            return {
                id: null,
                type: entry.actor_type || 'system',
                name: entry.actor_name || 'System',
                email: entry.actor_email || null,
                display_name: entry.actor_name || 'System',
                initials: this.getInitials(entry.actor_name || 'System'),
                avatar_url: null,
                is_system: true
            };
        }

        const actor = actorsMap.get(entry.actor_id);
        return {
            id: entry.actor_id,
            type: entry.actor_type || 'user',
            name: actor?.display_name || entry.actor_name || 'User',
            email: actor?.email || entry.actor_email || null,
            display_name: actor?.display_name || entry.actor_name || 'User',
            initials: actor?.initials || this.getInitials(entry.actor_name || 'User'),
            avatar_url: actor?.avatar_url || null,
            is_system: false,
            role: actor?.role || null,
            status: actor?.status || 'active'
        };
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
            // Generate unique tracking ID for this creation attempt
            const trackingId = `TL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Use the standardized data structure
            const cleanedData = TimelineService.createTimelineEntryData(data);

            console.log(`🔍 DEBUG [${trackingId}]: Timeline createEntry called with:`, {
                originalData: data,
                cleanedData: cleanedData,
                timestamp: new Date().toISOString(),
                fullStackTrace: new Error().stack
            });

            // Enhanced duplicate check - look for recent entries with same entity and activity
            if (cleanedData.entity_type && cleanedData.entity_id && cleanedData.activity_type) {
                const recentEntries = await this.supabase
                    .from(this.entityName)
                    .select('id, created_at, field_changed, changes_summary, old_value, new_value, actor_id, actor_type')
                    .eq('entity_type', cleanedData.entity_type)
                    .eq('entity_id', cleanedData.entity_id)
                    .eq('activity_type', cleanedData.activity_type)
                    .gte('created_at', new Date(Date.now() - 15000).toISOString()) // Last 15 seconds
                    .order('created_at', { ascending: false });

                if (recentEntries.data && recentEntries.data.length > 0) {
                    console.log(`⚠️ WARNING [${trackingId}]: Found ${recentEntries.data.length} recent similar entries:`, recentEntries.data);

                    // Check for duplicates based on multiple criteria
                    const duplicateEntry = recentEntries.data.find(entry => {
                        // Same field changed and changes summary
                        const sameFieldAndChanges = entry.field_changed === cleanedData.field_changed &&
                            entry.changes_summary === cleanedData.changes_summary;

                        // Very recent (within 10 seconds)
                        const veryRecent = Math.abs(new Date(entry.created_at) - new Date()) < 10000;

                        // If we have a user actor and existing entry has system actor, prioritize user entry
                        const shouldPreferUserEntry = cleanedData.actor_type === 'user' && entry.actor_type === 'system';

                        return sameFieldAndChanges && veryRecent && !shouldPreferUserEntry;
                    });

                    if (duplicateEntry) {
                        console.log(`🚫 BLOCKING DUPLICATE [${trackingId}]: Found very similar entry created recently:`, {
                            existingId: duplicateEntry.id,
                            existingCreatedAt: duplicateEntry.created_at,
                            existingActorType: duplicateEntry.actor_type,
                            newActorType: cleanedData.actor_type,
                            timeDiff: new Date() - new Date(duplicateEntry.created_at),
                            reason: 'Preventing duplicate timeline entry'
                        });

                        // If the new entry has better actor info (user vs system), update the existing entry
                        if (cleanedData.actor_type === 'user' && duplicateEntry.actor_type === 'system' && cleanedData.actor_id) {
                            console.log(`🔄 UPDATING EXISTING ENTRY [${trackingId}]: Enhancing system entry with user actor info`);

                            const { data: updatedEntry, error: updateError } = await this.supabase
                                .from(this.entityName)
                                .update({
                                    actor_id: cleanedData.actor_id,
                                    actor_name: cleanedData.actor_name,
                                    actor_type: cleanedData.actor_type,
                                    actor_email: cleanedData.actor_email
                                })
                                .eq('id', duplicateEntry.id)
                                .select()
                                .single();

                            if (!updateError && updatedEntry) {
                                console.log(`✅ ENHANCED EXISTING ENTRY [${trackingId}]: Updated entry with proper actor info`);
                                return updatedEntry;
                            }
                        }

                        // Return the existing entry instead of creating a new one
                        return duplicateEntry;
                    }
                }
            }

            // Validate required fields
            const requiredFields = ['entity_type', 'entity_id', 'activity_type', 'workspace_id', 'client_id'];
            const missingFields = requiredFields.filter(field => !cleanedData[field]);

            if (missingFields.length > 0) {
                throw new errors.BadRequest(`Missing required fields: ${missingFields.join(', ')}`);
            }

            const { data: result, error } = await this.supabase
                .from(this.entityName)
                .insert(cleanedData)
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ DEBUG [${trackingId}]: Timeline entry created successfully:`, {
                id: result.id,
                activity_type: result.activity_type,
                field_changed: result.field_changed,
                hasOldValue: !!result.old_value,
                hasNewValue: !!result.new_value,
                created_at: result.created_at
            });

            return result;
        } catch (err) {
            console.error(`❌ DEBUG: Timeline createEntry error:`, err);
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
     * Enhanced method to track changes with detailed comparison
     * Returns structured data for old_value and new_value fields
     */
    static trackDetailedChanges(oldData, newData, fieldsToTrack = []) {
        const changedFields = [];
        const changesSummary = [];

        fieldsToTrack.forEach(field => {
            if (oldData[field] !== newData[field]) {
                changedFields.push(field);

                // Create human-readable summary
                const oldValue = TimelineService.cleanValue(oldData[field]);
                const newValue = TimelineService.cleanValue(newData[field]);
                const oldDisplay = oldValue || 'empty';
                const newDisplay = newValue || 'empty';
                changesSummary.push(`${field}: ${oldDisplay} → ${newDisplay}`);
            }
        });

        if (changedFields.length === 0) {
            return { changes: null, summary: '', fieldsChanged: [], changeData: null };
        }

        // Create structured change data for old_value and new_value
        const changeData = TimelineService.createChangeData(oldData, newData, changedFields);

        return {
            changes: changeData, // For backwards compatibility
            summary: changesSummary.join(', '),
            fieldsChanged: changedFields,
            changeData: changeData // Structured data for old_value and new_value
        };
    }

    /**
     * Clean data values before storing (remove complex objects, images, etc.)
     */
    static cleanValue(value) {
        // Handle null/undefined
        if (value === null || value === undefined) {
            return null;
        }

        // Handle strings
        if (typeof value === 'string') {
            // Check if it's a URL or base64 image
            if (value.startsWith('http') || value.startsWith('data:image') || value.startsWith('blob:')) {
                return '[Image/File URL]';
            }
            // Truncate very long strings
            return value.length > 200 ? value.substring(0, 200) + '...' : value;
        }

        // Handle numbers, booleans
        if (typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }

        // Handle objects/arrays - stringify but limit size
        if (typeof value === 'object') {
            try {
                const stringified = JSON.stringify(value);
                return stringified.length > 500 ? '[Complex Object]' : stringified;
            } catch (e) {
                return '[Object]';
            }
        }

        return String(value);
    }

    /**
     * Create standardized timeline entry data structure
     */
    static createTimelineEntryData(baseData) {
        // Ensure we only use fields that exist in the database
        const allowedFields = [
            'entity_type', 'entity_id', 'activity_type', 'activity_subtype',
            'title', 'description', 'summary', 'related_ticket_id', 'related_email_id',
            'related_note_id', 'related_call_id', 'related_meeting_id', 'related_conversation_id',
            'field_changed', 'changes_summary', 'old_value', 'new_value', 'actor_id', 'actor_name', 'actor_type', 'actor_email',
            'source', 'priority', 'is_internal', 'response_time_minutes', 'activity_date',
            'workspace_id', 'client_id'
        ];

        const cleanedData = {};

        allowedFields.forEach(field => {
            if (baseData.hasOwnProperty(field)) {
                cleanedData[field] = baseData[field];
            }
        });

        // Ensure required fields have defaults
        return {
            activity_date: new Date(),
            is_internal: false,
            actor_type: 'system',
            source: 'system',
            ...cleanedData
        };
    }

    /**
     * Log sentiment change activity
     */
    async logSentimentActivity(entityType, entityId, sentimentData, workspaceId, clientId) {
        const oldSentiment = sentimentData.old_sentiment || {};
        const newSentiment = sentimentData.new_sentiment || {};

        let changeDescription = '';
        if (oldSentiment.text !== newSentiment.text) {
            changeDescription = `Sentiment changed from ${oldSentiment.text || 'unknown'} to ${newSentiment.text || 'unknown'}`;
        }
        if (oldSentiment.score !== newSentiment.score) {
            changeDescription += ` (score: ${oldSentiment.score || 0} → ${newSentiment.score || 0})`;
        }

        // Fetch actual user name if actor_id is provided
        const actorName = sentimentData.actor_name || await this.getUserName(sentimentData.actor_id);

        // Create structured change data
        const changeData = TimelineService.createSentimentChangeData(oldSentiment, newSentiment);

        const entryData = TimelineService.createTimelineEntryData({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: 'sentiment_update',
            activity_subtype: 'changed',
            title: 'Sentiment Analysis Updated',
            summary: changeDescription,
            description: 'Sentiment analysis results changed', // Simple text description
            related_ticket_id: sentimentData.ticket_id,
            field_changed: 'sentiment', // Only the actual field name
            changes_summary: changeDescription,
            old_value: changeData, // Structured change data includes old_value
            new_value: changeData, // Same data structure for consistency
            actor_id: sentimentData.actor_id || null,
            actor_name: actorName,
            actor_type: 'system',
            workspace_id: workspaceId,
            client_id: clientId,
            source: 'system',
            is_internal: true,
            activity_date: new Date()
        });

        return this.createEntry(entryData);
    }

    /**
     * Track tag changes activity
     */
    async logTagActivity(entityType, entityId, tagData, workspaceId, clientId) {
        const tagChanges = TimelineService.trackTagChanges(tagData.old_tag_ids, tagData.new_tag_ids);

        if (!tagChanges) return null;

        // Fetch actual user name if actor_id is provided
        const actorName = tagData.actor_name || await this.getUserName(tagData.actor_id);

        // Create structured tag change data
        const changeData = TimelineService.createTagChangeData(
            tagData.old_tag_ids,
            tagData.new_tag_ids,
            tagData.added_tag_names,
            tagData.removed_tag_names
        );

        const entryData = TimelineService.createTimelineEntryData({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: 'tag_update',
            activity_subtype: 'changed',
            title: 'Tags Updated',
            summary: `Tags updated: ${tagChanges.summary}`,
            description: 'Entity tags were modified', // Simple text description
            field_changed: 'tags', // Only the actual field name
            changes_summary: tagChanges.summary,
            old_value: changeData, // Structured tag change data
            new_value: changeData, // Same data structure for consistency
            actor_id: tagData.actor_id,
            actor_name: actorName,
            actor_type: tagData.actor_type || 'user',
            workspace_id: workspaceId,
            client_id: clientId,
            source: tagData.source || 'web',
            activity_date: new Date()
        });

        return this.createEntry(entryData);
    }

    /**
     * Helper methods for common timeline entries
     */
    async logEntityCreated(entityType, entityId, workspaceId, clientId, userId, userName, additionalData = {}) {
        const entityName = entityType.charAt(0).toUpperCase() + entityType.slice(1);

        // Fetch actual user name if userId is provided and userName is not provided or is generic
        const actorName = await this.getUserName(userId) || 'System';

        const entryData = TimelineService.createTimelineEntryData({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: entityType === 'contact' ? 'contact_update' : entityType === 'company' ? 'company_update' : 'ticket',
            activity_subtype: 'created',
            title: `${entityName} was created`,
            summary: `${entityName} was created`,
            workspace_id: workspaceId,
            client_id: clientId,
            actor_id: userId,
            actor_name: actorName,
            actor_type: 'user',
            source: additionalData.source || 'web',
            ...additionalData
        });

        return this.createEntry(entryData);
    }

    async logEntityUpdated(entityType, entityId, changes, workspaceId, clientId, userId, userName, additionalData = {}) {
        const entityName = entityType.charAt(0).toUpperCase() + entityType.slice(1);

        // Fetch actual user name if userId is provided and userName is not provided or is generic
        const actorName = await this.getUserName(userId) || 'System';

        // Extract actual field names that were changed
        let changedFieldNames = '';
        if (changes && changes.fields_updated) {
            // If it's structured change data, extract field names
            changedFieldNames = changes.fields_updated.map(field => field.field_name).join(', ');
        } else if (changes && typeof changes === 'object') {
            // If it's a simple object with changed fields
            changedFieldNames = Object.keys(changes).join(', ');
        }

        const entryData = TimelineService.createTimelineEntryData({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: entityType === 'contact' ? 'contact_update' : entityType === 'company' ? 'company_update' : 'ticket',
            activity_subtype: 'updated',
            title: `${entityName} was updated`,
            summary: `${entityName} was updated (${changedFieldNames})`,
            description: `${entityName} information was modified`, // Simple text description
            changes_summary: additionalData.changes_summary || changedFieldNames,
            field_changed: changedFieldNames, // Only actual field names
            old_value: changes, // Structured change data passed from caller
            new_value: changes, // Same data structure for consistency
            workspace_id: workspaceId,
            client_id: clientId,
            actor_id: userId,
            actor_name: actorName,
            actor_type: 'user',
            source: additionalData.source || 'web',
            ...additionalData
        });

        return this.createEntry(entryData);
    }

    /**
     * Track tag changes activity
     */
    static trackTagChanges(oldTagIds, newTagIds) {
        const oldTags = Array.isArray(oldTagIds) ? oldTagIds : (oldTagIds ? [oldTagIds] : []);
        const newTags = Array.isArray(newTagIds) ? newTagIds : (newTagIds ? [newTagIds] : []);

        const added = newTags.filter(tag => !oldTags.includes(tag));
        const removed = oldTags.filter(tag => !newTags.includes(tag));

        if (added.length === 0 && removed.length === 0) return null;

        return {
            added,
            removed,
            summary: [
                added.length > 0 ? `Added: ${added.join(', ')}` : '',
                removed.length > 0 ? `Removed: ${removed.join(', ')}` : ''
            ].filter(Boolean).join('; ')
        };
    }

    /**
     * Create standardized change data structure
     */
    static createChangeData(oldData, newData, fieldsChanged) {
        const changeData = {
            fields_updated: [],
            total_changes: 0,
            change_type: 'update'
        };

        fieldsChanged.forEach(field => {
            const oldValue = TimelineService.cleanValue(oldData[field]);
            const newValue = TimelineService.cleanValue(newData[field]);

            const fieldChange = {
                field_name: field,
                field_type: TimelineService.getFieldType(oldValue, newValue),
                old_value: oldValue,
                new_value: newValue,
                changed: oldValue !== newValue
            };

            // Add human-readable description for simple fields
            if (fieldChange.field_type === 'simple') {
                fieldChange.description = `${field} updated`;
                fieldChange.display_text = `${oldValue || 'empty'} → ${newValue || 'empty'}`;
            } else {
                fieldChange.description = `${field} updated (complex data)`;
                fieldChange.display_text = `${field} was updated`;
            }

            changeData.fields_updated.push(fieldChange);
        });

        changeData.total_changes = changeData.fields_updated.length;
        return changeData;
    }

    /**
     * Create standardized tag change data structure
     */
    static createTagChangeData(oldTagIds, newTagIds, addedTagNames, removedTagNames) {
        const oldTags = Array.isArray(oldTagIds) ? oldTagIds : (oldTagIds ? [oldTagIds] : []);
        const newTags = Array.isArray(newTagIds) ? newTagIds : (newTagIds ? [newTagIds] : []);

        const added = newTags.filter(tag => !oldTags.includes(tag));
        const removed = oldTags.filter(tag => !newTags.includes(tag));

        return {
            fields_updated: [{
                field_name: 'tags',
                field_type: 'tags',
                old_value: {
                    tag_ids: oldTags,
                    tag_names: removedTagNames || [],
                    count: oldTags.length
                },
                new_value: {
                    tag_ids: newTags,
                    tag_names: addedTagNames || [],
                    count: newTags.length
                },
                changed: added.length > 0 || removed.length > 0,
                description: 'Tags updated',
                display_text: [
                    added.length > 0 ? `Added: ${(addedTagNames || []).join(', ')}` : '',
                    removed.length > 0 ? `Removed: ${(removedTagNames || []).join(', ')}` : ''
                ].filter(Boolean).join('; '),
                tags_added: added,
                tags_removed: removed,
                tag_names_added: addedTagNames || [],
                tag_names_removed: removedTagNames || []
            }],
            total_changes: 1,
            change_type: 'tags'
        };
    }

    /**
     * Create standardized sentiment change data structure
     */
    static createSentimentChangeData(oldSentiment, newSentiment) {
        return {
            fields_updated: [{
                field_name: 'sentiment',
                field_type: 'sentiment',
                old_value: {
                    text: oldSentiment?.text || 'unknown',
                    score: oldSentiment?.score || 0,
                    confidence: oldSentiment?.confidence || 0
                },
                new_value: {
                    text: newSentiment?.text || 'unknown',
                    score: newSentiment?.score || 0,
                    confidence: newSentiment?.confidence || 0
                },
                changed: oldSentiment?.text !== newSentiment?.text || oldSentiment?.score !== newSentiment?.score,
                description: 'Sentiment analysis updated',
                display_text: `${oldSentiment?.text || 'unknown'} → ${newSentiment?.text || 'unknown'} (score: ${oldSentiment?.score || 0} → ${newSentiment?.score || 0})`
            }],
            total_changes: 1,
            change_type: 'sentiment'
        };
    }

    /**
     * Determine field type for better frontend handling
     */
    static getFieldType(oldValue, newValue) {
        // Check if either value is an object/array
        if (typeof oldValue === 'object' || typeof newValue === 'object') {
            return 'complex';
        }

        // Check if it's a URL or image
        if (typeof oldValue === 'string' && (oldValue.startsWith('http') || oldValue.startsWith('data:image'))) {
            return 'url';
        }
        if (typeof newValue === 'string' && (newValue.startsWith('http') || newValue.startsWith('data:image'))) {
            return 'url';
        }

        return 'simple';
    }

    /**
     * Helper method to fetch user name by ID
     */
    async getUserName(userId) {
        if (!userId) return 'System';

        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('fName, lName, name')
                .eq('id', userId)
                .single();

            if (error || !data) return 'System';

            // Try different name field combinations
            if (data.name) return data.name;
            if (data.fName || data.lName) {
                return `${data.fName || ''} ${data.lName || ''}`.trim();
            }

            return 'User';
        } catch (err) {
            console.error('Error fetching user name:', err);
            return 'System';
        }
    }

    /**
     * Format changes for frontend display
     */
    formatChangesForFrontend(entry) {
        if (!entry.old_value || !entry.new_value) return null;

        try {
            const oldValue = typeof entry.old_value === 'string' ? JSON.parse(entry.old_value) : entry.old_value;
            const newValue = typeof entry.new_value === 'string' ? JSON.parse(entry.new_value) : entry.new_value;

            if (oldValue.fields_updated) {
                return {
                    fields_updated: oldValue.fields_updated.map(field => ({
                        ...field,
                        formatted_old: this.formatValueForDisplay(field.old_value),
                        formatted_new: this.formatValueForDisplay(field.new_value),
                        change_type: this.getChangeType(field.old_value, field.new_value)
                    })),
                    total_changes: oldValue.total_changes || oldValue.fields_updated.length,
                    change_type: oldValue.change_type || 'update',
                    summary: entry.changes_summary
                };
            }
        } catch (e) {
            // Fallback for non-structured data
            return {
                summary: entry.changes_summary,
                raw_old: entry.old_value,
                raw_new: entry.new_value
            };
        }

        return null;
    }

    /**
     * Get activity category for grouping
     */
    getActivityCategory(activityType) {
        const categories = {
            'email': 'Communication',
            'ticket': 'Support',
            'note': 'Internal',
            'call': 'Communication',
            'meeting': 'Communication',
            'contact_update': 'Data Change',
            'company_update': 'Data Change',
            'tag_update': 'Data Change',
            'sentiment_update': 'Analysis'
        };
        return categories[activityType] || 'Other';
    }

    /**
     * Get activity icon
     */
    getActivityIcon(activityType, activitySubtype = null) {
        const icons = {
            'email': activitySubtype === 'sent' ? 'mail-send' : 'mail-receive',
            'ticket': 'ticket',
            'note': 'note',
            'call': 'phone',
            'meeting': 'calendar',
            'contact_update': 'user-edit',
            'company_update': 'building-edit',
            'tag_update': 'tag',
            'sentiment_update': 'chart-line'
        };
        return icons[activityType] || 'activity';
    }

    /**
     * Get activity color
     */
    getActivityColor(activityType) {
        const colors = {
            'email': 'blue',
            'ticket': 'orange',
            'note': 'gray',
            'call': 'green',
            'meeting': 'purple',
            'contact_update': 'indigo',
            'company_update': 'cyan',
            'tag_update': 'pink',
            'sentiment_update': 'yellow'
        };
        return colors[activityType] || 'gray';
    }

    /**
     * Get date grouping for timeline organization
     */
    getDateGroup(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays <= 7) return 'This Week';
        if (diffInDays <= 30) return 'This Month';
        if (diffInDays <= 90) return 'Last 3 Months';
        return 'Older';
    }

    /**
     * Get display title
     */
    getDisplayTitle(entry) {
        if (entry.title && entry.title !== 'null' && entry.title.trim() !== '') {
            return entry.title;
        }

        // If there's a related ticket, try to use its title
        if (entry.activity_type === 'ticket' && entry.related_ticket && entry.related_ticket.title) {
            return entry.related_ticket.title;
        }

        // Generate title based on activity type
        const titles = {
            'email': entry.activity_subtype === 'sent' ? 'Email Sent' : 'Email Received',
            'ticket': entry.related_ticket ?
                (entry.related_ticket.title || `Ticket #${entry.related_ticket.sno || 'Unknown'}`) :
                `Ticket ${entry.activity_subtype || 'Activity'}`,
            'note': 'Note Added',
            'contact_update': 'Contact Updated',
            'company_update': 'Company Updated',
            'tag_update': 'Tags Updated'
        };

        return titles[entry.activity_type] || 'Activity';
    }

    /**
     * Get display summary
     */
    getDisplaySummary(entry) {
        if (entry.summary && entry.summary !== 'null' && entry.summary.trim() !== '') {
            return entry.summary;
        }
        if (entry.changes_summary) return entry.changes_summary;

        // If there's a related ticket and the summary is null, create one from ticket data
        if (entry.activity_type === 'ticket' && entry.related_ticket) {
            const ticketTitle = entry.related_ticket.title || 'Ticket';
            const ticketNumber = entry.related_ticket.sno || entry.related_ticket.id;

            switch (entry.activity_subtype) {
                case 'created':
                    return `Support ticket #${ticketNumber}: ${ticketTitle}`;
                case 'updated':
                    return `Ticket #${ticketNumber} was updated: ${ticketTitle}`;
                case 'closed':
                    return `Ticket #${ticketNumber} was closed: ${ticketTitle}`;
                default:
                    return `Ticket #${ticketNumber}: ${ticketTitle}`;
            }
        }

        return entry.description || 'No summary available';
    }

    /**
     * Get display description
     */
    getDisplayDescription(entry) {
        if (entry.activity_type === 'note' && entry.description && entry.description !== 'null') {
            return entry.description;
        }
        if (entry.changes_summary) {
            return `Changes made: ${entry.changes_summary}`;
        }

        // If there's a related ticket and the description is null, use ticket description
        if (entry.activity_type === 'ticket' && entry.related_ticket &&
            (!entry.description || entry.description === 'null' || entry.description.trim() === '')) {
            return entry.related_ticket.description || null;
        }

        return entry.description && entry.description !== 'null' ? entry.description : null;
    }

    /**
     * Get importance level for priority sorting
     */
    getImportanceLevel(entry) {
        // High importance
        if (entry.activity_type === 'ticket' && entry.priority === 'urgent') return 'high';
        if (entry.activity_type === 'email' && entry.response_time_minutes > 1440) return 'high'; // > 24 hours

        // Medium importance
        if (entry.activity_type === 'ticket') return 'medium';
        if (entry.activity_type === 'email') return 'medium';
        if (entry.activity_type === 'contact_update' || entry.activity_type === 'company_update') return 'medium';

        // Low importance
        return 'low';
    }

    /**
     * Get user initials
     */
    getInitials(name) {
        if (!name) return 'SY';
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    }

    /**
     * Format value for display
     */
    formatValueForDisplay(value) {
        if (value === null || value === undefined) return 'empty';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (typeof value === 'string' && value.length > 100) return value.substring(0, 100) + '...';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    /**
     * Get change type for styling
     */
    getChangeType(oldValue, newValue) {
        if (oldValue === null || oldValue === undefined || oldValue === '') return 'added';
        if (newValue === null || newValue === undefined || newValue === '') return 'removed';
        return 'modified';
    }

    /**
     * Get ticket status color
     */
    getTicketStatusColor(status) {
        const colors = {
            'open': 'green',
            'in-progress': 'yellow',
            'pending': 'orange',
            'closed': 'gray',
            'resolved': 'blue'
        };
        return colors[status] || 'gray';
    }

    /**
     * Get ticket priority color
     */
    getTicketPriorityColor(priority) {
        const colors = {
            'low': 'gray',
            'normal': 'blue',
            'high': 'orange',
            'urgent': 'red'
        };
        return colors[priority] || 'gray';
    }

    /**
     * Legacy method for backward compatibility
     */
    async enrichTimelineData(timelineData) {
        return this.enrichTimelineDataForFrontend(timelineData);
    }

    /**
     * Log custom field activity for tickets
     */
    async logCustomFieldActivity(entityType, entityId, customFieldData, workspaceId, clientId) {
        const fieldName = customFieldData.field_name || 'Custom Field';
        const oldValue = customFieldData.old_value;
        const newValue = customFieldData.new_value;
        const action = customFieldData.action || 'changed';

        let title, summary, description;

        switch (action) {
            case 'created':
                title = `Added custom field: ${fieldName}`;
                summary = `Custom field "${fieldName}" was added with value: ${newValue || 'empty'}`;
                description = `Custom field "${fieldName}" was created`;
                break;
            case 'updated':
                title = `Updated custom field: ${fieldName}`;
                summary = `Custom field "${fieldName}": ${oldValue || 'empty'} → ${newValue || 'empty'}`;
                description = `Custom field "${fieldName}" was modified`;
                break;
            default:
                title = `Custom field changed: ${fieldName}`;
                summary = `Custom field "${fieldName}" was updated`;
                description = `Custom field "${fieldName}" was modified`;
        }

        // Fetch actual user name if actor_id is provided
        const actorName = customFieldData.actor_name || await this.getUserName(customFieldData.actor_id);

        // Create structured change data
        const changeData = TimelineService.createCustomFieldChangeData(
            customFieldData.custom_field_id,
            fieldName,
            oldValue,
            newValue
        );

        const entryData = TimelineService.createTimelineEntryData({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: 'custom_field',
            activity_subtype: action,
            title: title,
            summary: summary,
            description: description,
            field_changed: fieldName,
            changes_summary: summary,
            old_value: changeData,
            new_value: changeData,
            actor_id: customFieldData.actor_id || null,
            actor_name: actorName,
            actor_type: customFieldData.actor_type || 'user',
            workspace_id: workspaceId,
            client_id: clientId,
            source: customFieldData.source || 'web',
            activity_date: new Date()
        });

        return this.createEntry(entryData);
    }

    /**
     * Log custom object activity for tickets
     */
    async logCustomObjectActivity(entityType, entityId, customObjectData, workspaceId, clientId) {
        const objectName = customObjectData.object_name || 'Custom Object';
        const fieldName = customObjectData.field_name || 'Field';
        const oldValue = customObjectData.old_value;
        const newValue = customObjectData.new_value;
        const action = customObjectData.action || 'changed';

        let title, summary, description;

        switch (action) {
            case 'created':
                title = `Added custom object field: ${objectName}.${fieldName}`;
                summary = `Custom object "${objectName}" field "${fieldName}" was added with value: ${newValue || 'empty'}`;
                description = `Custom object "${objectName}" field "${fieldName}" was created`;
                break;
            case 'updated':
                title = `Updated custom object field: ${objectName}.${fieldName}`;
                summary = `Custom object "${objectName}" field "${fieldName}": ${oldValue || 'empty'} → ${newValue || 'empty'}`;
                description = `Custom object "${objectName}" field "${fieldName}" was modified`;
                break;
            default:
                title = `Custom object field changed: ${objectName}.${fieldName}`;
                summary = `Custom object "${objectName}" field "${fieldName}" was updated`;
                description = `Custom object "${objectName}" field "${fieldName}" was modified`;
        }

        // Fetch actual user name if actor_id is provided
        const actorName = customObjectData.actor_name || await this.getUserName(customObjectData.actor_id);

        // Create structured change data
        const changeData = TimelineService.createCustomObjectChangeData(
            customObjectData.custom_object_id,
            customObjectData.custom_object_field_id,
            objectName,
            fieldName,
            oldValue,
            newValue
        );

        const entryData = TimelineService.createTimelineEntryData({
            entity_type: entityType,
            entity_id: entityId,
            activity_type: 'custom_object',
            activity_subtype: action,
            title: title,
            summary: summary,
            description: description,
            field_changed: `${objectName}.${fieldName}`,
            changes_summary: summary,
            old_value: changeData,
            new_value: changeData,
            actor_id: customObjectData.actor_id || null,
            actor_name: actorName,
            actor_type: customObjectData.actor_type || 'user',
            workspace_id: workspaceId,
            client_id: clientId,
            source: customObjectData.source || 'web',
            activity_date: new Date()
        });

        return this.createEntry(entryData);
    }

    /**
     * Create standardized custom field change data structure
     */
    static createCustomFieldChangeData(customFieldId, fieldName, oldValue, newValue) {
        return {
            fields_updated: [{
                field_name: fieldName,
                field_type: 'custom_field',
                custom_field_id: customFieldId,
                old_value: TimelineService.cleanValue(oldValue),
                new_value: TimelineService.cleanValue(newValue),
                changed: oldValue !== newValue,
                description: `Custom field "${fieldName}" updated`,
                display_text: `${oldValue || 'empty'} → ${newValue || 'empty'}`
            }],
            total_changes: 1,
            change_type: 'custom_field'
        };
    }

    /**
     * Create standardized custom object change data structure
     */
    static createCustomObjectChangeData(customObjectId, customObjectFieldId, objectName, fieldName, oldValue, newValue) {
        return {
            fields_updated: [{
                field_name: `${objectName}.${fieldName}`,
                field_type: 'custom_object',
                custom_object_id: customObjectId,
                custom_object_field_id: customObjectFieldId,
                object_name: objectName,
                field_name_within_object: fieldName,
                old_value: TimelineService.cleanValue(oldValue),
                new_value: TimelineService.cleanValue(newValue),
                changed: oldValue !== newValue,
                description: `Custom object "${objectName}" field "${fieldName}" updated`,
                display_text: `${oldValue || 'empty'} → ${newValue || 'empty'}`
            }],
            total_changes: 1,
            change_type: 'custom_object'
        };
    }

    /**
     * Fix existing timeline entries that have null titles/descriptions but have related_ticket_id
     * This method can be called to backfill missing ticket information
     */
    async fixNullTicketTimelineEntries(workspaceId, clientId) {
        try {
            console.log('🔄 Starting to fix null ticket timeline entries...', {
                workspaceId,
                clientId,
                entityName: this.entityName
            });

            // Find timeline entries with null titles but have related_ticket_id
            const { data: nullEntries, error } = await this.supabase
                .from(this.entityName)
                .select('id, related_ticket_id, title, summary, description')
                .eq('activity_type', 'ticket')
                .eq('workspace_id', workspaceId)
                .eq('client_id', clientId)
                .is('deleted_at', null)
                .not('related_ticket_id', 'is', null);

            if (error) throw error;

            console.log(`📊 Found ${nullEntries?.length || 0} timeline entries to fix`);

            if (!nullEntries || nullEntries.length === 0) {
                return { updated: 0, total: 0, message: 'No entries to fix' };
            }

            console.log(`📊 Processing all ${nullEntries.length} timeline entries with ticket IDs`);

            let updatedCount = 0;

            for (const entry of nullEntries) {
                if (!entry.related_ticket_id) continue;

                try {
                    // Fetch ticket details
                    const { data: ticket, error: ticketError } = await this.supabase
                        .from('tickets')
                        .select('id, sno, title, description, priority')
                        .eq('id', entry.related_ticket_id)
                        .single();

                    if (ticketError || !ticket) {
                        console.warn(`⚠️ Could not find ticket ${entry.related_ticket_id} for timeline entry ${entry.id}`);
                        continue;
                    }

                    console.log(`Processing entry ${entry.id}:`, {
                        currentTitle: entry.title,
                        currentSummary: entry.summary,
                        currentDescription: entry.description,
                        ticketTitle: ticket.title,
                        ticketSno: ticket.sno
                    });

                    const updates = {};

                    // Always update title if it's null or empty
                    if (!entry.title || entry.title === 'null' || entry.title.trim() === '' || entry.title === null) {
                        updates.title = ticket.title || `Ticket #${ticket.sno}`;
                        console.log(`Will update title to: ${updates.title}`);
                    }

                    // Always update summary if it's null or empty
                    if (!entry.summary || entry.summary === 'null' || entry.summary.trim() === '' || entry.summary === null) {
                        updates.summary = ticket.title ?
                            `Support ticket #${ticket.sno}: ${ticket.title}` :
                            `Support ticket #${ticket.sno}`;
                        console.log(`Will update summary to: ${updates.summary}`);
                    }

                    // Always update description if it's null or empty
                    if (!entry.description || entry.description === 'null' || entry.description.trim() === '' || entry.description === null) {
                        updates.description = ticket.description || ticket.title || 'Ticket activity';
                        console.log(`Will update description to: ${updates.description}`);
                    }

                    if (Object.keys(updates).length > 0) {
                        const { error: updateError } = await this.supabase
                            .from(this.entityName)
                            .update(updates)
                            .eq('id', entry.id);

                        if (updateError) {
                            console.error(`❌ Error updating timeline entry ${entry.id}:`, updateError);
                        } else {
                            updatedCount++;
                            console.log(`✅ Updated timeline entry ${entry.id} with ticket data`);
                        }
                    }
                } catch (err) {
                    console.error(`❌ Error processing timeline entry ${entry.id}:`, err);
                }
            }

            console.log(`🎉 Fixed ${updatedCount} timeline entries`);
            return { updated: updatedCount, total: nullEntries.length, found: nullEntries.length };

        } catch (err) {
            console.error('❌ Error fixing null ticket timeline entries:', err);
            console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                code: err.code
            });
            return { error: true, message: err.message, updated: 0, total: 0 };
        }
    }
}

module.exports = TimelineService; 