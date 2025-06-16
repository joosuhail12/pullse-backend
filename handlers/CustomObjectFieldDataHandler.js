const BaseHandler = require('./BaseHandler');
const CustomObjectFieldDataService = require('../services/CustomObjectFieldDataService');

class CustomObjectFieldDataHandler extends BaseHandler {
    constructor() {
        super();
    }

    async createCustomObjectFieldData(req, reply) {
        req.body.createdBy = req.authUser.id;

        let inst = new CustomObjectFieldDataService();
        return this.responder(req, reply, inst.createCustomObjectFieldData(req.body));
    }

    async listCustomObjectFieldData(req, reply) {
        let filters = {
            customObjectFieldId: req.query.custom_object_field_id,
            entityType: req.query.entity_type,
            entityId: req.query.entity_id,
            createdFrom: req.query.created_from,
            createdTo: req.query.created_to,
            skip: req.query.skip,
            limit: req.query.limit,
            page: req.query.page,
            sort_by: req.query.sort_by,
            sort_order: req.query.sort_order
        };

        let inst = new CustomObjectFieldDataService();
        return this.responder(req, reply, inst.paginate(filters));
    }

    async getCustomObjectFieldDataByEntity(req, reply) {
        let entityType = req.params.entity_type;
        let entityId = req.params.entity_id;

        let inst = new CustomObjectFieldDataService();
        return this.responder(req, reply, inst.getCustomObjectFieldDataByEntity(entityType, entityId));
    }

    async showCustomObjectFieldDataDetail(req, reply) {
        let inst = new CustomObjectFieldDataService();
        return this.responder(req, reply, inst.getCustomObjectFieldData(req.params.custom_object_field_data_id));
    }

    async updateCustomObjectFieldData(req, reply) {
        let id = req.params.custom_object_field_data_id;
        let toUpdate = req.body;
        toUpdate.updatedBy = req.authUser.id;

        let inst = new CustomObjectFieldDataService();
        return this.responder(req, reply, inst.updateCustomObjectFieldData(id, toUpdate));
    }

    async deleteCustomObjectFieldData(req, reply) {
        let id = req.params.custom_object_field_data_id;

        let inst = new CustomObjectFieldDataService();
        return this.responder(req, reply, inst.deleteCustomObjectFieldData(id));
    }

    async deleteCustomObjectFieldDataByEntity(req, reply) {
        let entityType = req.params.entity_type;
        let entityId = req.params.entity_id;

        let inst = new CustomObjectFieldDataService();
        return this.responder(req, reply, inst.deleteCustomObjectFieldDataByEntity(entityType, entityId));
    }

    async getCustomObjectFieldDataByIds(req, reply) {
        const customObjectFieldIds = req.body.customObjectFieldIds;

        let inst = new CustomObjectFieldDataService();
        return this.responder(req, reply, inst.getCustomObjectFieldDataByIds(customObjectFieldIds));
    }

    async getCustomObjectFieldDataBatch(req, reply) {
        const customObjectFieldIds = req.body.customObjectFieldIds;
        const entityType = req.query.entity_type;
        const entityId = req.query.entity_id;

        let inst = new CustomObjectFieldDataService();
        return this.responder(req, reply, inst.getCustomObjectFieldDataBatch(customObjectFieldIds, entityType, entityId));
    }
}

module.exports = CustomObjectFieldDataHandler; 