const authMiddlewares = require('../../middlewares/auth');
const AuthType = require('../../constants/AuthType');
const Handler = require('../../handlers/AnalyticsHandler');

async function activate(app) {
    const handler = new Handler();
    const base_url = '/api/analytics';
    app.route({
        url: base_url + '/total-open-tickets-day-wise',
        method: 'GET',
        name: 'Total number of open tickets day wise',
        preHandler: authMiddlewares.checkClerkToken(AuthType.user),
        schema: {
            tags: ['Analytics'],
            summary: 'Total number of open tickets day wise',
            query: {
                type: 'object',
                properties: {
                    workspace_id: { type: 'string' },
                },
            },
        },
        handler: async (req, reply) => {
            return handler.getTotalOpenTicketsDayWise(req, reply);
        },
    });
}

module.exports = { activate };