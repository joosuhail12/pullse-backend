const Promise = require("bluebird");
const errors = require("../errors");
const EmailDomainUtility = require('../db/utilities/EmailDomainUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");

class EmailDomainService extends BaseService {

    constructor() {
        super();
        this.utilityInst = new EmailDomainUtility();
        this.entityName = 'EmailDomain';
        this.listingFields = ["id", "name", "domain", "-_id"];
        this.updatableFields = [ "name", "domain", "description"];
    }

    async createEmailDomain(emailDomainData) {
        try {
            let { name, domain, clientId, workspaceId, createdBy } = emailDomainData;
            let emailDomain = await this.findOne({ domain, clientId, workspaceId });
            if (!_.isEmpty(emailDomain)) {
                return Promise.reject(new errors.AlreadyExist(this.entityName + " already exist."));
            }
            return this.create(emailDomainData);
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let emailDomain = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(emailDomain)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            return emailDomain;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateEmailDomain({ id, workspaceId, clientId }, updateValues) {
        try {
            let emailDomain = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: emailDomain.id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }


    async deleteEmailDomain({ id, workspaceId, clientId }) {
        try {
            let emailDomain = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(emailDomain.id);
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

module.exports = EmailDomainService;
