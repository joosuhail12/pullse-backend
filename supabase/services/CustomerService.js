const _ = require("lodash");
const Promise = require("bluebird");
const CustomerUtility = require('../db/utilities/CustomerUtility');
const BaseService = require("./BaseService");
const CompanyService = require("./CompanyService");
const TagService = require("./TagService");
const errors = require("../errors");
const CSVHandler = require('../FileManagement/CSVFileSystem');
const { CustomerEventPublisher } = require("../Events/CustomerEvent");

class CustomerService extends BaseService {

    constructor(fields=null, dependencies={}) {
        super();
        this.entityName = "Customer";
        this.TagService = dependencies.TagService;
        this.utilityInst = new CustomerUtility();
        this.listingFields = [ "id", "name", "email", "type", "title", "externalId", "language", "companyId" ];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = [ "name", "email", "type", "title", "workPhone", "phone", "phoneCountry", "externalId", "twitter", "linkedin", "timezone", "language", "address", "about", "notes", "companyId", "sessions", "tagIds", "lastActiveAt", "archiveAt" ];
    }

    async findOrCreateCustomer(customerData = {}) {
        try {
            const { email, workspaceId, clientId } = customerData;
            let customer = await this.utilityInst.findOne({ email, workspaceId, clientId });
            if (!customer) {
                let data = await this.utilityInst.insert(customerData);
                customer = await this.utilityInst.findOne(data);
                let inst = new CustomerEventPublisher();
                await inst.created(customer);
            }
            return customer;
        } catch(err) {
            return this.handleError(err);
        }
    }

    async validateCustomerData(row) {
        return Promise.resolve();
    }

    async importCustomerData({fileSrc, workspaceId, clientId, createdBy}) {
        try {
            let inst = new CSVHandler();
            let companyServiceInst = new CompanyService();
            let rowCount = 0;
            let errorRows = [];
            await inst.getData(fileSrc, async (row) => {
                rowCount++;
                if (!this.validateCustomerData(row)) {
                    errorRows.push(rowCount);
                    return;
                }
                let company = await companyServiceInst.createCompany(row.company);
                let customerData = {
                    workspaceId, clientId, createdBy,
                    name: row.name,
                    email: row.email,
                    type: row.type,
                    phone: row.phone,
                    phoneCountry: row.phoneCountry,
                    companyId: company.id,
                };
                return this.findOrCreateCustomer(customerData);
            });

            return { total: rowCount, errorRows };
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let customer = await this.utilityInst.findOne({ id, workspaceId, clientId });
            if (!customer) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            return customer;
        } catch(err) {
            return this.handleError(err);
        }
    }

    async updateCustomer({ id, workspaceId, clientId }, updateValues) {
        try {
            await this.getDetails(id, workspaceId, clientId);
            await this.utilityInst.updateOne({ id, workspaceId, clientId }, updateValues);
            let inst = new CustomerEventPublisher();
            await inst.updated(id, updateValues);
            return Promise.resolve();
        } catch(err) {
            return this.handleError(err);
        }
    }

    async bulkAction({ ids, action, workspaceId, clientId, tagIds }) {
        try {
            let filters = { id: { $in: ids }, workspaceId, clientId };
            let updateValues = {};
            if (action === 'archive') {
                updateValues.archiveAt = new Date();
            }
            if (action === 'restore') {
                updateValues.archiveAt = null;
            }
            if ((action === 'removeTags' || action === 'addTags') && tagIds) {
                let tagServiceInst = new this.TagService();
                let tagCount = await tagServiceInst.count({ id: { $in: tagIds }, workspaceId, clientId });
                if (tagCount !== tagIds.length) {
                    return Promise.reject(new errors.BadRequest("Invalid tag ids"));
                }
                if (action === 'removeTags') {
                    updateValues.tagIds = tagIds.filter(tag => !tagIds.includes(tag));
                } else {
                    updateValues.tagIds = [...(updateValues.tagIds || []), ...tagIds];
                }
            }
            await this.utilityInst.updateMany(filters, updateValues);
            return Promise.resolve();
        } catch (error) {
            return this.handleError(error);
        }
    }

    async deleteCustomer({ id, workspaceId, clientId }) {
        try {
            let customer = await this.getDetails(id, workspaceId, clientId);
            await this.utilityInst.updateOne({ id: customer.id }, { archiveAt: new Date() });
            return Promise.resolve();
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, email, type, companyId, archived, workspaceId, clientId, lastActiveFrom, lastActiveTo }) {
        let filters = { workspaceId, clientId };

        if (name) filters.name = { ilike: `%${name}%` };
        if (email) filters.email = email;
        if (type) filters.type = type;
        if (companyId) filters.companyId = companyId;
        if (archived) filters.archiveAt = { not: null };
        if (lastActiveFrom) filters.lastActiveAt = { gte: lastActiveFrom };
        if (lastActiveTo) filters.lastActiveAt = { lte: lastActiveTo };
        
        return filters;
    }
}

module.exports = CustomerService;
