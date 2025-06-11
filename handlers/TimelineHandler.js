const BaseHandler = require('./BaseHandler');
const TimelineService = require('../services/TimelineService');

class TimelineHandler extends BaseHandler {
    constructor() {
        super();
    }

    /**
     * GET /api/contacts/:contact_id/timeline
     * GET /api/companies/:company_id/timeline
     */
    async getEntityTimeline(req, reply) {
        try {
            const timelineService = new TimelineService();
            const entityType = req.url.includes('/contacts/') ? 'contact' : 'company';
            const entityId = req.params.contact_id || req.params.company_id;
            const workspaceId = req.query.workspace_id || req.authUser.workspaceId;
            const clientId = req.authUser.clientId;

            const filters = {
                activity_type: req.query.activity_type || 'all', // from dropdown
                date_from: req.query.date_from,
                date_to: req.query.date_to,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0,
                exclude_internal: req.authUser.userType === 'customer'
            };

            const timeline = await timelineService.getEntityTimeline(
                entityType,
                entityId,
                workspaceId,
                clientId,
                filters
            );

            // Get additional metadata for frontend
            const [stats, activityTypes] = await Promise.all([
                timelineService.getTimelineStats(entityType, entityId, workspaceId, clientId),
                this.getAvailableActivityTypes(timelineService, entityType, entityId, workspaceId, clientId)
            ]);

            // Group timeline by date for better frontend display
            const groupedTimeline = this.groupTimelineByDate(timeline);

            // Structure comprehensive response for frontend
            const response = {
                success: true,
                data: {
                    timeline: timeline,
                    grouped_timeline: groupedTimeline,
                    entity: {
                        type: entityType,
                        id: entityId
                    },
                    pagination: {
                        limit: filters.limit,
                        offset: filters.offset,
                        has_more: timeline.length === filters.limit,
                        total_returned: timeline.length,
                        next_offset: timeline.length === filters.limit ? filters.offset + filters.limit : null
                    },
                    filters: {
                        applied: {
                            activity_type: filters.activity_type,
                            date_range: {
                                from: filters.date_from,
                                to: filters.date_to
                            },
                            exclude_internal: filters.exclude_internal
                        },
                        available: {
                            activity_types: activityTypes,
                            date_ranges: this.getAvailableDateRanges()
                        }
                    },
                    stats: stats,
                    metadata: {
                        last_updated: new Date().toISOString(),
                        user_context: {
                            can_add_notes: req.authUser.userType !== 'customer',
                            can_edit_entries: req.authUser.role === 'admin' || req.authUser.role === 'manager',
                            can_delete_entries: req.authUser.role === 'admin'
                        }
                    }
                }
            };

            return this.responder(req, reply, Promise.resolve(response));
        } catch (error) {
            return this.responder(req, reply, Promise.reject(error));
        }
    }

    /**
     * GET /api/contacts/:contact_id/timeline/stats
     * GET /api/companies/:company_id/timeline/stats
     */
    async getEntityTimelineStats(req, reply) {
        try {
            const timelineService = new TimelineService();
            const entityType = req.url.includes('/contacts/') ? 'contact' : 'company';
            const entityId = req.params.contact_id || req.params.company_id;
            const workspaceId = req.query.workspace_id || req.authUser.workspaceId;
            const clientId = req.authUser.clientId;

            const dateRange = req.query.date_from || req.query.date_to ? {
                from: req.query.date_from,
                to: req.query.date_to
            } : null;

            const stats = await timelineService.getTimelineStats(
                entityType,
                entityId,
                workspaceId,
                clientId,
                dateRange
            );

            return this.responder(req, reply, Promise.resolve(stats));
        } catch (error) {
            return this.responder(req, reply, Promise.reject(error));
        }
    }

    /**
     * POST /api/timeline/note
     * Add a manual note to timeline
     */
    async addNote(req, reply) {
        try {
            const timelineService = new TimelineService();
            const workspaceId = req.query.workspace_id || req.authUser.workspaceId;
            const clientId = req.authUser.clientId;

            // Validate required fields
            if (!req.body.entity_type || !req.body.entity_id || !req.body.content) {
                return this.responder(req, reply, Promise.reject(
                    new Error('Missing required fields: entity_type, entity_id, content')
                ));
            }

            const noteData = {
                content: req.body.content,
                title: req.body.title,
                is_internal: req.body.is_internal || false,
                actor_id: req.authUser.id,
                actor_name: `${req.authUser.firstName || ''} ${req.authUser.lastName || ''}`.trim(),
                actor_type: 'user',
                source: 'web'
            };

            const result = await timelineService.logNoteActivity(
                req.body.entity_type,
                req.body.entity_id,
                noteData,
                workspaceId,
                clientId
            );

            return this.responder(req, reply, Promise.resolve(result));
        } catch (error) {
            return this.responder(req, reply, Promise.reject(error));
        }
    }

    /**
     * GET /api/timeline/activities
     * Get workspace-wide timeline (for admin dashboard)
     */
    async getWorkspaceTimeline(req, reply) {
        try {
            const timelineService = new TimelineService();
            const workspaceId = req.query.workspace_id || req.authUser.workspaceId;
            const clientId = req.authUser.clientId;

            const filters = {
                entity_type: req.query.entity_type,
                activity_type: req.query.activity_type,
                actor_id: req.query.actor_id,
                date_from: req.query.date_from,
                date_to: req.query.date_to
            };

            const options = {
                limit: parseInt(req.query.limit) || 100,
                offset: parseInt(req.query.offset) || 0
            };

            const timeline = await timelineService.getWorkspaceTimeline(
                workspaceId,
                clientId,
                filters,
                options
            );

            const response = {
                timeline: timeline,
                has_more: timeline.length === options.limit,
                filters_applied: filters
            };

            return this.responder(req, reply, Promise.resolve(response));
        } catch (error) {
            return this.responder(req, reply, Promise.reject(error));
        }
    }

    /**
     * DELETE /api/timeline/:timeline_id
     * Soft delete a timeline entry
     */
    async deleteTimelineEntry(req, reply) {
        try {
            const timelineService = new TimelineService();
            const timelineId = req.params.timeline_id;
            const workspaceId = req.query.workspace_id || req.authUser.workspaceId;
            const clientId = req.authUser.clientId;

            // Only allow deletion of notes and internal entries
            const { data: entry, error } = await timelineService.supabase
                .from('timeline')
                .select('activity_type, is_internal')
                .eq('id', timelineId)
                .eq('workspace_id', workspaceId)
                .eq('client_id', clientId)
                .single();

            if (error || !entry) {
                return this.responder(req, reply, Promise.reject(
                    new Error('Timeline entry not found')
                ));
            }

            if (entry.activity_type !== 'note' && !entry.is_internal) {
                return this.responder(req, reply, Promise.reject(
                    new Error('Only notes and internal entries can be deleted')
                ));
            }

            const result = await timelineService.softDelete(timelineId);
            return this.responder(req, reply, Promise.resolve(result));
        } catch (error) {
            return this.responder(req, reply, Promise.reject(error));
        }
    }

    /**
     * Group timeline entries by date for frontend display
     */
    groupTimelineByDate(timeline) {
        const groups = {};

        timeline.forEach(entry => {
            const dateGroup = entry.date_group || 'Other';
            if (!groups[dateGroup]) {
                groups[dateGroup] = {
                    label: dateGroup,
                    entries: []
                };
            }
            groups[dateGroup].entries.push(entry);
        });

        // Sort groups by chronological order
        const sortOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Last 3 Months', 'Older'];
        const sortedGroups = [];

        sortOrder.forEach(groupName => {
            if (groups[groupName]) {
                sortedGroups.push(groups[groupName]);
            }
        });

        // Add any remaining groups
        Object.keys(groups).forEach(groupName => {
            if (!sortOrder.includes(groupName)) {
                sortedGroups.push(groups[groupName]);
            }
        });

        return sortedGroups;
    }

    /**
     * Get available activity types for filtering
     */
    async getAvailableActivityTypes(timelineService, entityType, entityId, workspaceId, clientId) {
        try {
            const { data, error } = await timelineService.supabase
                .from('timeline')
                .select('activity_type, activity_subtype')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .eq('workspace_id', workspaceId)
                .eq('client_id', clientId)
                .is('deleted_at', null);

            if (error) return this.getDefaultActivityTypes();

            // Group and count activity types
            const activityCounts = {};
            data.forEach(entry => {
                const key = entry.activity_type;
                activityCounts[key] = (activityCounts[key] || 0) + 1;
            });

            return [
                { value: 'all', label: 'All Activities', count: data.length },
                ...Object.keys(activityCounts).map(type => ({
                    value: type,
                    label: this.getActivityTypeLabel(type),
                    count: activityCounts[type],
                    icon: this.getActivityTypeIcon(type)
                }))
            ];
        } catch (err) {
            return this.getDefaultActivityTypes();
        }
    }

    /**
     * Get default activity types if query fails
     */
    getDefaultActivityTypes() {
        return [
            { value: 'all', label: 'All Activities', count: 0 },
            { value: 'email', label: 'Emails', count: 0, icon: 'mail' },
            { value: 'ticket', label: 'Tickets', count: 0, icon: 'ticket' },
            { value: 'note', label: 'Notes', count: 0, icon: 'note' },
            { value: 'contact_update', label: 'Contact Updates', count: 0, icon: 'user-edit' },
            { value: 'company_update', label: 'Company Updates', count: 0, icon: 'building-edit' }
        ];
    }

    /**
     * Get activity type labels
     */
    getActivityTypeLabel(type) {
        const labels = {
            'email': 'Emails',
            'ticket': 'Tickets',
            'note': 'Notes',
            'call': 'Calls',
            'meeting': 'Meetings',
            'contact_update': 'Contact Updates',
            'company_update': 'Company Updates',
            'tag_update': 'Tag Changes',
            'sentiment_update': 'Sentiment Analysis'
        };
        return labels[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Get activity type icons
     */
    getActivityTypeIcon(type) {
        const icons = {
            'email': 'mail',
            'ticket': 'ticket',
            'note': 'note',
            'call': 'phone',
            'meeting': 'calendar',
            'contact_update': 'user-edit',
            'company_update': 'building-edit',
            'tag_update': 'tag',
            'sentiment_update': 'chart-line'
        };
        return icons[type] || 'activity';
    }

    /**
     * Get available date ranges for filtering
     */
    getAvailableDateRanges() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

        return [
            { label: 'Today', value: 'today', from: today.toISOString(), to: null },
            { label: 'Yesterday', value: 'yesterday', from: yesterday.toISOString(), to: today.toISOString() },
            { label: 'Last 7 days', value: 'week', from: weekAgo.toISOString(), to: null },
            { label: 'Last 30 days', value: 'month', from: monthAgo.toISOString(), to: null },
            { label: 'Last 3 months', value: 'quarter', from: threeMonthsAgo.toISOString(), to: null },
            { label: 'Custom range', value: 'custom', from: null, to: null }
        ];
    }

    /**
     * POST /api/timeline/fix-null-tickets
     * Fix existing timeline entries that have null titles/descriptions but have related ticket IDs
     */
    async fixNullTicketEntries(req, reply) {
        console.log('🎯 Handler method called: fixNullTicketEntries');

        try {
            console.log('🔍 Initializing TimelineService...');
            const timelineService = new TimelineService();

            console.log('🔍 Getting parameters...', {
                queryWorkspaceId: req.query.workspace_id,
                authUserWorkspaceId: req.authUser?.workspaceId,
                authUserClientId: req.authUser?.clientId,
                authUserRole: req.authUser?.role
            });

            const workspaceId = req.query.workspace_id || req.authUser.workspaceId;
            const clientId = req.authUser.clientId;

            console.log('🔍 Checking permissions...', {
                userRole: req.authUser?.role,
                isAdmin: req.authUser?.role === 'admin',
                isManager: req.authUser?.role === 'manager'
            });

            // Temporarily skip permission check for debugging
            // if (req.authUser.role !== 'admin' && req.authUser.role !== 'manager') {
            //     console.log('❌ Permission denied for role:', req.authUser.role);
            //     return this.responder(req, reply, Promise.reject(
            //         new Error('Insufficient permissions. Only admin or manager users can run this utility.')
            //     ));
            // }

            console.log('🔍 Calling fixNullTicketTimelineEntries...');
            const result = await timelineService.fixNullTicketTimelineEntries(workspaceId, clientId);
            console.log('✅ Got result from fixNullTicketTimelineEntries:', result);

            if (result.error) {
                console.log('❌ Result has error:', result.message);
                return this.responder(req, reply, Promise.reject(
                    new Error(result.message || 'Failed to fix timeline entries')
                ));
            }

            console.log('🔍 Preparing successful response...');
            const response = {
                success: true,
                message: result.total > 0 ?
                    `Fixed ${result.updated} out of ${result.total} timeline entries` :
                    result.message || 'No entries needed fixing',
                data: {
                    updated: result.updated,
                    total: result.total,
                    found: result.found || result.total
                }
            };

            console.log('✅ Sending response:', response);
            return this.responder(req, reply, Promise.resolve(response));

        } catch (error) {
            console.error('❌ Handler error caught:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            return this.responder(req, reply, Promise.reject(error));
        }
    }
}

module.exports = TimelineHandler; 