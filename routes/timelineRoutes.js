const TimelineHandler = require('../handlers/TimelineHandler');
const authMiddlewares = require('../middlewares/auth');
const AuthType = require('../constants/AuthType');

async function activate(app) {
    const timelineHandler = new TimelineHandler();
    const base_url = '/api';

    // Contact timeline routes
    app.route({
        url: base_url + '/contacts/:contact_id/timeline',
        method: 'GET',
        name: 'GetContactTimeline',
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ['Timeline'],
            summary: 'Get Contact Timeline',
            description: 'API to get activity timeline for a contact.',
            params: {
                type: 'object',
                properties: {
                    contact_id: { type: 'string', format: 'uuid' }
                },
                required: ['contact_id']
            },
            querystring: {
                type: 'object',
                properties: {
                    activity_type: { type: 'string', enum: ['all', 'email', 'ticket', 'note', 'call', 'meeting', 'contact_update'] },
                    date_from: { type: 'string', format: 'date' },
                    date_to: { type: 'string', format: 'date' },
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
                    offset: { type: 'integer', minimum: 0, default: 0 },
                    workspace_id: { type: 'string', format: 'uuid' }
                }
            }
        },
        handler: timelineHandler.getEntityTimeline.bind(timelineHandler)
    });

    app.route({
        url: base_url + '/contacts/:contact_id/timeline/stats',
        method: 'GET',
        name: 'GetContactTimelineStats',
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ['Timeline'],
            summary: 'Get Contact Timeline Statistics',
            description: 'API to get timeline statistics for a contact.',
            params: {
                type: 'object',
                properties: {
                    contact_id: { type: 'string', format: 'uuid' }
                },
                required: ['contact_id']
            },
            querystring: {
                type: 'object',
                properties: {
                    date_from: { type: 'string', format: 'date' },
                    date_to: { type: 'string', format: 'date' },
                    workspace_id: { type: 'string', format: 'uuid' }
                }
            }
        },
        handler: timelineHandler.getEntityTimelineStats.bind(timelineHandler)
    });

    // Company timeline routes  
    app.route({
        url: base_url + '/companies/:company_id/timeline',
        method: 'GET',
        name: 'GetCompanyTimeline',
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ['Timeline'],
            summary: 'Get Company Timeline',
            description: 'API to get activity timeline for a company.',
            params: {
                type: 'object',
                properties: {
                    company_id: { type: 'string', format: 'uuid' }
                },
                required: ['company_id']
            },
            querystring: {
                type: 'object',
                properties: {
                    activity_type: { type: 'string', enum: ['all', 'email', 'ticket', 'note', 'call', 'meeting', 'company_update'] },
                    date_from: { type: 'string', format: 'date' },
                    date_to: { type: 'string', format: 'date' },
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
                    offset: { type: 'integer', minimum: 0, default: 0 },
                    workspace_id: { type: 'string', format: 'uuid' }
                }
            }
        },
        handler: timelineHandler.getEntityTimeline.bind(timelineHandler)
    });

    app.route({
        url: base_url + '/companies/:company_id/timeline/stats',
        method: 'GET',
        name: 'GetCompanyTimelineStats',
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ['Timeline'],
            summary: 'Get Company Timeline Statistics',
            description: 'API to get timeline statistics for a company.',
            params: {
                type: 'object',
                properties: {
                    company_id: { type: 'string', format: 'uuid' }
                },
                required: ['company_id']
            },
            querystring: {
                type: 'object',
                properties: {
                    date_from: { type: 'string', format: 'date' },
                    date_to: { type: 'string', format: 'date' },
                    workspace_id: { type: 'string', format: 'uuid' }
                }
            }
        },
        handler: timelineHandler.getEntityTimelineStats.bind(timelineHandler)
    });

    // Manual note addition
    app.route({
        url: base_url + '/timeline/note',
        method: 'POST',
        name: 'AddTimelineNote',
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ['Timeline'],
            summary: 'Add Timeline Note',
            description: 'API to add a manual note to timeline.',
            body: {
                type: 'object',
                properties: {
                    entity_type: { type: 'string', enum: ['contact', 'company', 'ticket'] },
                    entity_id: { type: 'string', format: 'uuid' },
                    content: { type: 'string', minLength: 1 },
                    title: { type: 'string' },
                    is_internal: { type: 'boolean', default: false }
                },
                required: ['entity_type', 'entity_id', 'content']
            },
            querystring: {
                type: 'object',
                properties: {
                    workspace_id: { type: 'string', format: 'uuid' }
                }
            }
        },
        handler: timelineHandler.addNote.bind(timelineHandler)
    });

    // Workspace-wide timeline (for admin dashboard)
    app.route({
        url: base_url + '/timeline/activities',
        method: 'GET',
        name: 'GetWorkspaceTimeline',
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ['Timeline'],
            summary: 'Get Workspace Timeline',
            description: 'API to get workspace-wide timeline activities.',
            querystring: {
                type: 'object',
                properties: {
                    entity_type: { type: 'string', enum: ['contact', 'company', 'ticket'] },
                    activity_type: { type: 'string', enum: ['email', 'ticket', 'note', 'call', 'meeting', 'company_update', 'contact_update', 'system'] },
                    actor_id: { type: 'string', format: 'uuid' },
                    date_from: { type: 'string', format: 'date' },
                    date_to: { type: 'string', format: 'date' },
                    limit: { type: 'integer', minimum: 1, maximum: 200, default: 100 },
                    offset: { type: 'integer', minimum: 0, default: 0 },
                    workspace_id: { type: 'string', format: 'uuid' }
                }
            }
        },
        handler: timelineHandler.getWorkspaceTimeline.bind(timelineHandler)
    });

    // Delete timeline entry (soft delete)
    app.route({
        url: base_url + '/timeline/:timeline_id',
        method: 'DELETE',
        name: 'DeleteTimelineEntry',
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ['Timeline'],
            summary: 'Delete Timeline Entry',
            description: 'API to soft delete a timeline entry.',
            params: {
                type: 'object',
                properties: {
                    timeline_id: { type: 'string', format: 'uuid' }
                },
                required: ['timeline_id']
            },
            querystring: {
                type: 'object',
                properties: {
                    workspace_id: { type: 'string', format: 'uuid' }
                }
            }
        },
        handler: timelineHandler.deleteTimelineEntry.bind(timelineHandler)
    });
}

module.exports = { activate }; 