const Promise = require("bluebird");
const errors = require("../errors");
const CannedResponseUtility = require('../db/utilities/CannedResponseUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");

class CannedResponseService extends BaseService {

    constructor() {
        super();
        this.utilityInst = new CannedResponseUtility();
        this.entityName = 'CannedResponse';
        this.listingFields = ["id", "name", "description", "message", "-_id"];
        this.updatableFields = [ "name", "description", "message" ];
    }

    async createCannedResponse(cannedResponseData) {
        try {
            let { name, clientId, workspaceId } = cannedResponseData;
            let cannedResponse = await this.findOne({ name: { $regex : `^${name}$`, $options: "i" }, clientId, workspaceId });
            if (!_.isEmpty(cannedResponse)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            return this.create(cannedResponseData);
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let cannedResponse = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(cannedResponse)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            return cannedResponse;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateCannedResponse({ id, workspaceId, clientId }, updateValues) {
        try {
            let cannedResponse = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: cannedResponse.id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }


    async deleteCannedResponse({ id, workspaceId, clientId }) {
        try {
            let cannedResponse = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(cannedResponse.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = {};
        filters.workspaceId = workspaceId;
        filters.clientId = clientId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
        }

        if (createdFrom) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$gte'] = createdFrom;
        }
        if (createdTo) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$lt'] = createdTo;
        }

        return filters;
    }
}

module.exports = CannedResponseService;
