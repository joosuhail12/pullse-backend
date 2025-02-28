const Promise = require("bluebird");
const errors = require("../errors");
const EmailTemplateUtility = require("../db/utilities/EmailTemplateUtility");
const BaseService = require("./BaseService");
const _ = require("lodash");

class EmailTemplateService extends BaseService {
    constructor() {
        super();
        this.utilityInst = new EmailTemplateUtility();
        this.entityName = "EmailTemplate";
        this.listingFields = ["id", "name", "event", "subject"];
        this.updatableFields = ["name", "event", "description", "subject", "body"];
    }

    async createEmailTemplate(emailTemplateData) {
        try {
            let { event, clientId, workspaceId } = emailTemplateData;
            let emailTemplate = await this.findOne({ event, clientId, workspaceId });
            if (!_.isEmpty(emailTemplate)) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} already exists for this event.`));
            }
            return this.create(emailTemplateData);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let emailTemplate = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(emailTemplate)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }
            return emailTemplate;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateEmailTemplate({ id, workspaceId, clientId }, updateValues) {
        try {
            let emailTemplate = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: emailTemplate.id }, updateValues);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteEmailTemplate({ id, workspaceId, clientId }) {
        try {
            let emailTemplate = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(emailTemplate.id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = { workspaceId, clientId };

        if (name) {
            filters.name = { $ilike: `%${name}%` };
        }

        if (createdFrom) {
            filters.createdAt = { $gte: createdFrom };
        }
        if (createdTo) {
            filters.createdAt = { ...filters.createdAt, $lte: createdTo };
        }

        return filters;
    }
}

module.exports = EmailTemplateService;
