const BaseHandler = require('./BaseHandler');
const CustomFieldDataService = require('../services/CustomFieldDataService');

class CustomFieldDataHandler extends BaseHandler {
    constructor() {
        super();
    }

    async createCustomFieldData(req, reply) {
        req.body.createdBy = req.authUser.id;

        let inst = new CustomFieldDataService();
        return this.responder(req, reply, inst.createCustomFieldData(req.body));
    }

    async listCustomFieldData(req, reply) {
        let filters = {
            customfieldId: req.query.custom_field_id,
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

        let inst = new CustomFieldDataService();
        return this.responder(req, reply, inst.paginate(filters));
    }

    async getCustomFieldDataByEntity(req, reply) {
        let entityType = req.params.entity_type;
        let entityId = req.params.entity_id;

        let inst = new CustomFieldDataService();
        return this.responder(req, reply, inst.getCustomFieldDataByEntity(entityType, entityId));
    }

    async showCustomFieldDataDetail(req, reply) {
        let inst = new CustomFieldDataService();
        return this.responder(req, reply, inst.getCustomFieldData(req.params.custom_field_data_id));
    }

    async updateCustomFieldData(req, reply) {
        let id = req.params.custom_field_data_id;
        let toUpdate = req.body;

        let inst = new CustomFieldDataService();
        return this.responder(req, reply, inst.updateCustomFieldData(id, toUpdate));
    }

    async deleteCustomFieldData(req, reply) {
        let id = req.params.custom_field_data_id;

        let inst = new CustomFieldDataService();
        return this.responder(req, reply, inst.deleteCustomFieldData(id));
    }

    async deleteCustomFieldDataByEntity(req, reply) {
        let entityType = req.params.entity_type;
        let entityId = req.params.entity_id;

        let inst = new CustomFieldDataService();
        return this.responder(req, reply, inst.deleteCustomFieldDataByEntity(entityType, entityId));
    }

    async getCustomFieldDataByIds(req, reply) {
        const customFieldIds = req.body.customFieldIds;

        let inst = new CustomFieldDataService();
        return this.responder(req, reply, inst.getCustomFieldDataByIds(customFieldIds));
    }

    async getCustomFieldDataBatch(req, reply) {
        const customFieldIds = req.body.customFieldIds;
        const entityType = req.query.entity_type;
        const entityId = req.query.entity_id;

        let inst = new CustomFieldDataService();
        return this.responder(req, reply, inst.getCustomFieldDataBatch(customFieldIds, entityType, entityId));
    }
}

module.exports = CustomFieldDataHandler; 