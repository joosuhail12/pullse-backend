const _ = require("lodash");
const Promise = require("bluebird");
const CustomerUtility = require('../db/utilities/CustomerUtility');
const BaseService = require("./BaseService");
const CompanyService = require("./CompanyService");
const TagService = require("./TagService");
const errors = require("../errors");
const CSVHandler = require('../FileManagement/CSVFileSystem')
const { CustomerEventPublisher } = require("../Events/CustomerEvent");

class CustomerService extends BaseService {

    constructor(fields=null, dependencies={}) {
        super();
        this.entityName = "Customer";
        this.TagService = dependencies.TagService;
        this.utilityInst = new CustomerUtility();
        this.listingFields = [ "id","name", "email", "type", "title", "externalId", "language", "companyId", "-_id" ];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = [ "name", "email", "type", "title", "workPhone", "phone", "phoneCountry", "externalId", "twitter", "linkedin", "timezone", "language", "address", "about", "notes", "companyId", "sessions", "tagIds", "lastActiveAt", "archiveAt" ];
    }

     /**
     * Finds or creates a customer
     * @param {Object} customerData - Customer data object containing email, workspaceId, and clientId.
     * @returns {Object} Customer object
     * @description
     - Finds a customer by email, workspaceId, and clientId.
    - If no customer is found, creates a new customer with the provided data.
    - Returns the found or created customer object.
    */
    async findOrCreateCustomer(customerData = {}) {
        try {
            const { email, workspaceId, clientId } = customerData;
            let customer = await this.findOne({ email, workspaceId, clientId });
            if (!customer) {
                let data = await this.create(customerData);
                customer = await this.findOne(data);
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

     /**
     * Imports customer data from a CSV file into the database.
     * @param {{fileSrc, workspaceId, clientId, createdBy}} - Object containing the file source, workspace ID, client ID and creator ID.
     * @returns {{total, errorRows}} - Object containing the total rows processed and any rows with errors.
     * @description
     *   - Reads customer data from the CSV file row by row.
     *   - Validates the data in each row.
     *   - Creates a customer object from valid rows and saves to the database.
     *   - Tracks the total rows processed and any rows with validation errors.
     *   - Returns the results.
     */
    async importCustomerData({fileSrc, workspaceId, clientId, createdBy}) {
        try {
            let inst = new CSVHandler();
            let companyServiceInst = new CompanyService();
            let rowCount = 0;
            let errorRows = [];
            inst.getData(fileSrc, async (row) => {
                rowCount++;
                if (!this.validateCustomerData(row)) {
                    errorRows.push(rowCount)
                    return Promise.resolve();
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

            return Promise.resolve({
                total: rowCount,
                errorRows: errorRows,
            });
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let customer = await this.findOne({ id, workspaceId, clientId });

            if (!_.isEmpty(customer)) {
                return customer;
            } else {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateCustomer({ id, workspaceId, clientId }, updateValues) {
        try {
            let customer = await this.getDetails(id, workspaceId, clientId);

            if (updateValues.companyId) {
                let inst = new CompanyService()
                let team = await inst.getDetails(updateValues.companyId, workspaceId, clientId);
            }
            if (updateValues.tagIds) {
                let inst = new TagService()
                let tag = await inst.getDetails({ id: { $in: updateValues.tagIds }, workspaceId, clientId }, {id: 1});
            }

            await this.update({ id: customer.id, workspaceId, clientId }, updateValues);
            let inst = new CustomerEventPublisher();
            await inst.updated(customer, updateValues);
            return Promise.resolve();
        } catch(err) {
            return this.handleError(err);
        }
    }

    /**
     * Performs a bulk action on multiple documents
     * @param {Object} params - Parameters for bulk action.
     * @returns {Promise} - Resolves if action succeeds, rejects if fails.
     * @description
     * - Archives documents if action is 'archive' by setting archiveAt date.
     * - Adds or removes tags from documents if action is 'addTags' or 'removeTags' and tagIds are provided.
     * - Validates tag ids exist before updating documents.
     * - Updates multiple documents matching filter criteria.
     * - Handles any errors.
     */
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
            if (action === 'removeTags' || action === 'addTags' && tagIds) {
                let tagServiceInst = new this.TagService();
                let tagCount = await tagServiceInst.count({ id: { $in: tagIds }, workspaceId, clientId });
                if (tagCount !== tagIds.length) {
                    return Promise.reject(new errors.BadRequest("Invalid tag ids"));
                }
                if (action === 'removeChatBots') {
                    updateValues['$pull'] = { tagIds: { $in: tagIds } };
                } else {
                    updateValues['$push'] = { tagIds: { $each: tagIds } };
                }
            }
            await this.updateMany(filters, updateValues);
            return Promise.resolve();
        } catch (error) {
            return this.handleError(error);
        }
    }

    async deleteCustomer({ id, workspaceId, clientId }) {
        try {
            let customer = await this.findOne({ id, workspaceId, clientId });
            let res = await this.softDelete(customer.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, email, type, companyId, archived, workspaceId, clientId, lastActiveFrom, lastActiveTo }) {
        let filters = {};

        filters.workspaceId = workspaceId;
        filters.clientId = clientId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
        }
        if (email) {
            filters.email = email;
        }
        if (type) {
            filters.type = type;
        }
        if (companyId) {
            filters.companyId = companyId;
        }


        if (archived) {
            filters.archiveAt = { $ne: null };
        }
        if (lastActiveFrom) {
            if (!filters.lastActiveAt) {
                filters.lastActiveAt = {}
            }
            filters.lastActiveAt['$gte'] = lastActiveFrom;
        }
        if (lastActiveTo) {
            if (!filters.lastActiveAt) {
                filters.lastActiveAt = {}
            }
            filters.lastActiveAt['$lt'] = lastActiveTo;
        }
        return filters;
    }
}

module.exports = CustomerService;
