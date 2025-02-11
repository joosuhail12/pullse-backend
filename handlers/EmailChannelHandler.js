const BaseHandler = require('./BaseHandler');
const EmailChannelService = require('../services/EmailChannelService');


class EmailChannelHandler extends BaseHandler {

    constructor() {
        super();
    }

    async createEmailChannel(req, reply) {
        req.body.createdBy = req.authUser.id;
        req.body.clientId = req.authUser.clientId;
        req.body.workspaceId = req.query.workspace_id;

        let inst = new EmailChannelService();
        return this.responder(req, reply, inst.createEmailChannel(req.body));
    }

    async deleteEmailChannel(req, reply) {
        req.body.createdBy = req.authUser.id;
        req.body.clientId = req.authUser.clientId;
        req.body.workspaceId = req.query.workspace_id;

        let inst = new EmailChannelService();
        return this.responder(req, reply, inst.deleteEmailChannel(req.body));
    }

    async getAllEmailChannel(req, reply) {
        req.body.createdBy = req.authUser.id;
        req.body.clientId = req.authUser.clientId;
        req.body.workspaceId = req.query.workspace_id;

        let inst = new EmailChannelService();
        return this.responder(req, reply, inst.getAllEmailChannel(req.body));
    }

    async getEmailChannelById(req, reply) {
        const id = req.params.id;
        req.body.createdBy = req.authUser.id;
        req.body.clientId = req.authUser.clientId;
        req.body.workspaceId = req.query.workspace_id;

        let inst = new EmailChannelService();
        return this.responder(req, reply, inst.getEmailChannelById({ id, ...req.body }));
    }
}

module.exports = EmailChannelHandler;
