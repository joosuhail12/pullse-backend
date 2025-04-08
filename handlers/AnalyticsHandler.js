const BaseHandler = require('./BaseHandler');
const AnalyticsService = require('../services/AnalyticsService');

class AnalyticsHandler extends BaseHandler {
    constructor() {
        super();
    }

    async getTotalOpenTicketsDayWise(req, reply) {
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;

        let inst = new AnalyticsService();
        return this.responder(req, reply, inst.getTotalOpenTicketsDayWise(workspaceId, clientId));
    }
}

module.exports = AnalyticsHandler;
