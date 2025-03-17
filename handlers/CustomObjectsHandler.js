const BaseHandler = require('./BaseHandler');
const CustomObjectService = require('../services/CustomObjectsService');


class CustomObjectHandler extends BaseHandler {

    constructor() {
        super();
    }

    async createCustomObject(req, reply) {
        req.body.createdBy = req.authUser.id;
        req.body.clientId = req.authUser.clientId;
        req.body.workspaceId = req.query.workspace_id;
        req.body.createdBy = req.authUser.id;

        let inst = new CustomObjectService();
        return this.responder(req, reply, inst.createCustomObject(req.body));
    }

    async listCustomObject(req, reply) {
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;
        let inst = new CustomObjectService();
        return this.responder(req, reply, inst.getAllCustomObjects(workspaceId, clientId));
    }

    async showCustomObjectDetail(req, reply) {
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;

        let inst = new CustomObjectService();
        return this.responder(req, reply, inst.getDetails(req.params.custom_object_id, workspaceId, clientId));
    }

    async updateCustomObject(req, reply) {
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;

        let id = req.params.custom_object_id;
        let toUpdate = req.body;
        let inst = new CustomObjectService();
        return this.responder(req, reply, inst.updateCustomObject({ id, workspaceId, clientId }, toUpdate));
    }

    async setCustomObjectValue(req, reply) {
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;

        let id = req.params.custom_object_id;
        let entityId = req.body.entityId;
        let fieldValue = req.body.fieldValue;
        let inst = new CustomObjectService();
        return this.responder(req, reply, inst.setCustomObjectValue({ id, workspaceId, clientId }, entityId, fieldValue));
    }

    async deleteCustomObject(req, reply) {
        let id = req.params.custom_object_id;
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;


        let inst = new CustomObjectService();
        return this.responder(req, reply, inst.deleteCustomObject({ id, workspaceId, clientId }));
    }

    async createCustomObjectField(req, reply) {
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;
        let createdBy = req.authUser.id;
        let id = req.params.custom_object_id;
        let toCreate = req.body;
        let inst = new CustomObjectService();
        return this.responder(req, reply, inst.createCustomObjectField({ id, workspaceId, clientId, createdBy }, toCreate));
    }

    async updateCustomObjectField(req, reply) {
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;
        let id = req.params.custom_object_id;
        let toUpdate = req.body;
        let inst = new CustomObjectService();
        return this.responder(req, reply, inst.updateCustomObjectField({ id, workspaceId, clientId }, toUpdate));
    }

    async deleteCustomObjectField(req, reply) {
        let workspaceId = req.query.workspace_id;
        let clientId = req.authUser.clientId;
        let id = req.params.custom_object_id;
        let inst = new CustomObjectService();
        return this.responder(req, reply, inst.deleteCustomObjectField({ id, workspaceId, clientId }));
    }

}

module.exports = CustomObjectHandler;
