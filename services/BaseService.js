const _ = require('lodash');
const bcrypt = require('bcrypt');
const logger = require('../logger');
const errors = require("../errors");
const config = require('../config')
const crypto = require('crypto');
const AuthConstants = require('../constants/AuthConstants');
const PaginationConstants = require('../constants/PaginationConstants');

class BaseService {

    constructor() {
        this.entityName = "Entity";
        this.pagination = true;
        this.logger = logger;
        this.listingFields = null;
        this.updatableFields = [];
        this.AuthConstants = AuthConstants;
        this.loggerMetaData = {
            service: this.constructor.name
        };
    }

    log({ message, data, level }) {
        let log = this.logger[level] || this.logger.info;
        log(message, {
            ...data,
            ...this.loggerMetaData
        });
    }

    async create(requestedData = {}) {
        try {
            let entity = await this.utilityInst.insert(requestedData);
            return { id: entity.id };
        }  catch(err) {
            return this.handleError(err);
        }
    }

    search(conditions, fields, options, pagination = true) {
        if (pagination) {
            return this.utilityInst.paginate(conditions, fields, options);
        }
        return this.utilityInst.find(conditions, fields, options);
    }


    async getDetails(filters, fields = null) {
        try {
            let entity = await this.findOne(filters, fields);

            if (!_.isEmpty(entity)) {
                return entity;
            } else {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async findOrFail(id) {
        try {
            let data = await this.findOne({ id });

            if (!_.isEmpty(data)) {
                return data;
            } else {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async findOne(filter = {}, fields = null) {
        try {
            let data = await this.utilityInst.findOne(filter, fields);
            return data;
        }  catch(err) {
            return this.handleError(err);
        }
    }
    
    // we can find all the field by using the find funtion and there no find funtion implement in the system
    async find(filter = {}, fields = null) {
        try {
            let data = await this.utilityInst.find(filter, fields);
            return data;
        } catch(err) {
            return this.handleError(err);
        }
    }


    async count(filter = {}) {
        try {
            let data = await this.utilityInst.countDocuments(filter);
            return data;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async update(filter, updateValues) {
        try {
            updateValues = _.pick(updateValues, this.updatableFields);
            let res = await this.updateOne(filter, updateValues);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    async updateOne(filter = {}, setData = {}) {
        try {
            let data = await this.utilityInst.updateOne(filter, setData);
            return data;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async softDelete(id, softDeleteField = 'archiveAt') { // set field to deletedAt when force is true
        try {
            let setData = {}
            setData[softDeleteField] = new Date();

            await this.findOrFail(id);
            await this.updateOne({ id }, setData);
            return Promise.resolve();
        } catch(err) {
            return this.handleError(err);
        }
    }

    async updateMany(filters, updateValues, options={}) {
        try {
            let res = await this.utilityInst.updateMany(filters, updateValues, options);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    async paginate(requestedData = {}, pagination=true) {
        try {
            let conditions = await this.parseFilters(requestedData);
            if (!conditions.archiveAt) {
                conditions.archiveAt = null;
            }

            requestedData.limit = parseInt(requestedData.limit) || PaginationConstants.LIMIT;
            let page = parseInt(requestedData.page) || PaginationConstants.PAGENUMBER;
            let skipCount = (page - 1) * requestedData.limit;
            let options = { limit: requestedData.limit, offset: skipCount, sort: {} };

            if (!_.isEmpty(requestedData.sort_by) && !_.isEmpty(requestedData.sort_order)) {
                options.sort[requestedData.sort_by] = requestedData.sort_order;
            }

            let data = await this.search(conditions, this.listingFields, options, pagination);
            return data;
        } catch(err) {
            return this.handleError(err);
        }
    }

    async bcryptToken(password) {
        let pass;
        try {
            pass =  await bcrypt.hash(String(password), this.AuthConstants.SALTROUNDS);
        }
        catch(err) {
            this.handleError(err);
        }
        return pass;
    }

    async generateCryptoToken() {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(20, (err, buf) => {
                if(err) {
                    return reject(err);
                }
                let token = buf.toString('hex');
                resolve(token);
            });
        });
    }

    /**
     * Aggregates data based on filters and updates values.
     * @param {object} options - Options object for aggregation.
     * @returns {object} Aggregated data.
     * @description
     *   - Applies filters to aggregate data from the utility instance.
     *   - Updates values based on updateValues parameter.
     *   - Returns aggregated data or handles any errors.
     */
    async aggregate(options=[]) {
        try {
            let res = await this.utilityInst.aggregate(options);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    handleError(err) {
        this.log({
            level: "error",
            // message,
            data: {
                err
            }
        });
        return Promise.reject(err);
    }

    parseFilters() {
        return {};
    }

}

module.exports = BaseService;