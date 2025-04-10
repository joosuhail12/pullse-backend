const BaseHandler = require('./BaseHandler');
const AblyService = require('../services/AblyService');

class AblyHandler extends BaseHandler {
    constructor() {
        super();
        this.serviceInst = new AblyService();
    }

    async generateWidgetToken(req, reply) {
        const apiKey = req.headers['x-api-key'];
        const workspaceId = req.headers['x-workspace-id'];
        const session = req.authUser;
        return await this.serviceInst.generateWidgetToken({ apiKey, workspaceId, session });
    }
}

module.exports = AblyHandler; 