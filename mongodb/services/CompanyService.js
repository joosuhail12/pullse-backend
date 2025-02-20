const Promise = require("bluebird");
const errors = require("../../errors");
const CompanyUtility = require('../db/utilities/CompanyUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");
const { CompanyEventPublisher } = require("../../Events/CompanyEvent");

class CompanyService extends BaseService {

    constructor() {
        super();
        this.utilityInst = new CompanyUtility();
        this.entityName = 'Company';
        this.listingFields = [ "id", "name", "phone", "numberOfEmployees", "annualRevenue", "websites", "accountTier", "industry",  "city", "state", "country", "-_id" ];
        this.updatableFields = [ "name", "description", "phone", "numberOfEmployees", "annualRevenue", "websites", "notes", "tagIds", "accountTier", "industry", "address", "city", "state", "zipcode", "country", ];
    }

    async createCompany(companyData = {}) {
        try {
            let { name, clientId, workspaceId } = companyData;
            let company = await this.findOne({ name: { $regex : `^${name}$`, $options: "i" }, clientId, workspaceId });
            if (!_.isEmpty(company)) {
                // return Promise.reject(new errors.AlreadyExist(this.entityName + " already exist."));
                return Promise.resolve(company);
            }
            company = await this.create(companyData);
            let inst = new CompanyEventPublisher();
            await inst.created(company);
            return company;
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let company = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(company)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            let companies = await this.utilityInst.populate('tags', [company]);
            return companies[0];
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateCompany({ id, workspaceId, clientId }, updateValues) {
        try {
            let company = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: company.id}, updateValues);
            let inst = new CompanyEventPublisher();
            await inst.updated(company, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }

    async deleteCompany({ id, workspaceId, clientId }) {
        try {
            let company = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(company.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, workspaceId, clientId, tagId, industry }) {
        let filters = {};
        filters.workspaceId = workspaceId;
        filters.clientId = clientId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
        }

        if (tagId) {
            filters.tagIds = tagId;
        }

        if (industry) {
            filters.industry = industry;
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

module.exports = CompanyService;
