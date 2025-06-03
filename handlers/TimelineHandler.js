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
                limit: req.query.limit || 50,
                offset: req.query.offset || 0,
                exclude_internal: req.authUser.userType === 'customer'
            };

            const timeline = await timelineService.getEntityTimeline(
                entityType,
                entityId,
                workspaceId,
                clientId,
                filters
            );

            // Structure response to match frontend expectations
            const response = {
                timeline: timeline,
                has_more: timeline.length === parseInt(filters.limit),
                total_count: timeline.length,
                filters_applied: {
                    activity_type: filters.activity_type,
                    date_range: {
                        from: filters.date_from,
                        to: filters.date_to
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
}

module.exports = TimelineHandler; 