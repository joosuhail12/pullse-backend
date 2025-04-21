const BaseHandler = require('./BaseHandler');
const WidgetService = require('../services/WidgetService');
const parser = require('ua-parser-js');
const { verifyJWTToken } = require('../Utils/commonUtils');
class WidgetHandler extends BaseHandler {

    constructor() {
        super();
    }

    async createWidget(req, reply) {
        req.body.createdBy = req.authUser.id;
        req.body.clientId = req.authUser.clientId;
        req.body.workspaceId = req.query.workspace_id;
        req.body.createdBy = req.authUser.id;

        let inst = new WidgetService();
        return this.responder(req, reply, inst.createWidget(req.body));
    }

    async getWidgets(req, reply) {
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;
        let inst = new WidgetService();
        return this.responder(req, reply, inst.getWidgets({ workspaceId, clientId }));
    }

    async getWidgetById(req, reply) {
        let widgetId = req.params.widget_id;
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;

        let inst = new WidgetService();
        return this.responder(req, reply, inst.getWidgetById({ widgetId, workspaceId, clientId }));
    }

    async updateWidget(req, reply) {
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;

        let toUpdate = req.body;

        let inst = new WidgetService();
        return this.responder(req, reply, inst.updateWidget({ workspaceId, clientId }, toUpdate));
    }

    async deleteWidget(req, reply) {
        let widgetId = req.params.widget_id;
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;


        let inst = new WidgetService();
        return this.responder(req, reply, inst.deleteWidget({ widgetId, workspaceId, clientId }));
    }

    async getWidgetConfig(req, reply) {
        let apiKey = req.params.api_key;
        let workspaceId = req.query.workspace_id;
        let publicIpAddress = req.ip;
        let timezone = req.body.timezone;
        let domain = req.headers['host'];

        let authUser = await verifyJWTToken(req.headers.authorization);
        console.log(authUser);
        let inst = new WidgetService();
        return this.responder(req, reply, inst.getWidgetConfig({ apiKey, workspaceId, publicIpAddress, timezone, domain, authUser }));
    }

    async createContactDevice(req, reply) {
        let inst = new WidgetService();
        let ua = parser(req.headers['user-agent']);
        let device = ua.browser.name || ua.os.name || ua.device.type || null;
        let operatingSystem = ua.os.name || null;
        let publicIpAddress = req.ip;
        req.body.device = device;
        req.body.operatingSystem = operatingSystem;
        req.body.publicIpAddress = publicIpAddress;
        req.body.apiKey = req.params.api_key;
        req.body.authUser = req.authUser;

        return this.responder(req, reply, inst.createContactDevice(req.body));
    }

    async getContactDeviceTickets(req, reply) {
        req.body.authUser = req.authUser;
        let inst = new WidgetService();
        return this.responder(req, reply, inst.getContactDeviceTickets(req.body));
    }

    async getConversationWithTicketId(req, reply) {
        let ticketId = req.params.ticket_id;
        let authUser = req.authUser;
        let inst = new WidgetService();
        return this.responder(req, reply, inst.getConversationWithTicketId(ticketId, authUser));
    }

    async uploadWidgetAsset(req, reply) {
        let inst = new WidgetService();
        const workspaceId = req.query.workspace_id;
        return this.responder(req, reply, inst.uploadWidgetAsset(workspaceId, req.body.file));
    }

    async getWidgetFieldOptions(req, reply) {
        let inst = new WidgetService();
        const workspaceId = req.query.workspace_id;
        const clientId = req.authUser.clientId;
        return this.responder(req, reply, inst.getWidgetFieldOptions(workspaceId, clientId));
    }
}

module.exports = WidgetHandler;
