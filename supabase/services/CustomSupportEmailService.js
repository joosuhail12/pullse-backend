const Promise = require("bluebird");
const errors = require("../errors");
const CustomSupportEmailUtility = require("../db/utilities/CustomSupportEmailUtility");
const BaseService = require("./BaseService");
const _ = require("lodash");

class CustomSupportEmailService extends BaseService {
    constructor() {
        super();
        this.utilityInst = new CustomSupportEmailUtility();
        this.entityName = "Custom Support Email";
        this.listingFields = ["id", "name", "email"];
        this.updatableFields = ["name", "email", "description"];
    }

    async createCustomSupportEmail(customSupportEmailData) {
        try {
            let { email, clientId, workspaceId } = customSupportEmailData;
            let customSupportEmail = await this.findOne({ email, clientId, workspaceId });
            if (!_.isEmpty(customSupportEmail)) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} already exists.`));
            }
            return this.create(customSupportEmailData);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let customSupportEmail = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(customSupportEmail)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }
            return customSupportEmail;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateCustomSupportEmail({ id, workspaceId, clientId }, updateValues) {
        try {
            let customSupportEmail = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: customSupportEmail.id }, updateValues);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteCustomSupportEmail({ id, workspaceId, clientId }) {
        try {
            let customSupportEmail = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(customSupportEmail.id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, email, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = { workspaceId, clientId };
        if (name) {
            filters.name = { ilike: `%${name}%` };
        }
        if (email) {
            filters.email = { ilike: `%${email}%` };
        }
        if (createdFrom) {
            filters.createdAt = filters.createdAt || {};
            filters.createdAt.gte = createdFrom;
        }
        if (createdTo) {
            filters.createdAt = filters.createdAt || {};
            filters.createdAt.lte = createdTo;
        }
        return filters;
    }
}

module.exports = CustomSupportEmailService;
