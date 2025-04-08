const BaseHandler = require('./BaseHandler');
const WidgetService = require('../services/WidgetService');


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

        let widgetId = req.params.widget_id;
        let toUpdate = req.body;

        let inst = new WidgetService();
        return this.responder(req, reply, inst.updateWidget({ widgetId, workspaceId, clientId }, toUpdate));
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
        let clientId = req.authUser.clientId;
        let inst = new WidgetService();
        return this.responder(req, reply, inst.getWidgetConfig({ apiKey, workspaceId, clientId }));
    }
}

module.exports = WidgetHandler;
