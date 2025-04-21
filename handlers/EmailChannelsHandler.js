const BaseHandler = require('./BaseHandler');
const EmailChannelsService = require('../services/EmailChannelsService');

class EmailChannelsHandler extends BaseHandler {

    constructor() {
        super();
    }

    async getEmailChannels(req, res) {
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;
        let inst = new EmailChannelsService();
        console.log(workspaceId, clientId, this.responder);
        return this.responder(req, res, inst.getEmailChannels({ workspaceId, clientId }));
    }

    async createEmailChannel(req, res) {
        req.body.workspaceId = req.query.workspace_id;
        req.body.clientId = req.authUser.clientId;
        req.body.createdBy = req.authUser.id;
        let inst = new EmailChannelsService();
        return this.responder(req, res, inst.createEmailChannel(req.body));
    }

    async updateEmailChannel(req, res) {
        req.body.workspaceId = req.query.workspace_id;
        req.body.clientId = req.authUser.clientId;
        req.body.emailChannelId = req.params.email_channel_id;
        let inst = new EmailChannelsService();
        return this.responder(req, res, inst.updateEmailChannel(req.body));
    }

    async deleteEmailChannel(req, res) {
        req.body.workspaceId = req.query.workspace_id;
        req.body.clientId = req.authUser.clientId;
        req.body.emailChannelId = req.params.email_channel_id;
        let inst = new EmailChannelsService();
        return this.responder(req, res, inst.deleteEmailChannel(req.body));
    }

    async getEmailChannelDetails(req, res) {
        req.body.workspaceId = req.query.workspace_id;
        req.body.clientId = req.authUser.clientId;
        req.body.emailChannelId = req.params.email_channel_id;
        let inst = new EmailChannelsService();
        return this.responder(req, res, inst.getEmailChannelDetails(req.body));
    }
}

module.exports = EmailChannelsHandler;
