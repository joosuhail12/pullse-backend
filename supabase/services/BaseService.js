const _ = require('lodash');
const bcrypt = require('bcrypt');
const logger = require('../logger');
const errors = require("../errors");
const config = require('../config');
const crypto = require('crypto');
const AuthConstants = require('../constants/AuthConstants');
const PaginationConstants = require('../constants/PaginationConstants');
const { supabase } = require('../db/supabaseClient');

class BaseService {
    constructor(tableName) {
        this.entityName = tableName;
        this.pagination = true;
        this.logger = logger;
        this.listingFields = null;
        this.updatableFields = [];
        this.AuthConstants = AuthConstants;
        this.loggerMetaData = { service: this.constructor.name };
    }

    log({ message, data, level }) {
        let log = this.logger[level] || this.logger.info;
        log(message, { ...data, ...this.loggerMetaData });
    }

    async create(record) {
        try {
            const { data, error } = await supabase.from(this.entityName).insert(record).select("id").single();
            if (error) throw error;
            return { id: data.id };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async search(conditions, fields, options, pagination = true) {
        let query = supabase.from(this.entityName).select(fields ? fields.join(", ") : '*');

        Object.entries(conditions).forEach(([key, value]) => {
            query = query.eq(key, value);
        });

        if (pagination) {
            query = query.range(options.offset, options.offset + options.limit - 1);
        }

        if (options.sort) {
            Object.entries(options.sort).forEach(([key, value]) => {
                query = query.order(key, { ascending: value === 'asc' });
            });
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async getDetails(filters, fields = null) {
        try {
            const data = await this.findOne(filters, fields);
            if (!_.isEmpty(data)) return data;
            throw new errors.NotFound(`${this.entityName} not found.`);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async findOrFail(id) {
        return this.getDetails({ id });
    }

    async findOne(filter = {}, fields = null) {
        let query = supabase.from(this.entityName).select(fields ? fields.join(", ") : '*').single();
        Object.entries(filter).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async count(filter = {}) {
        let query = supabase.from(this.entityName).select('*', { count: 'exact', head: true });
        Object.entries(filter).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        const { count, error } = await query;
        if (error) throw error;
        return count;
    }

    async update(filter, updateValues) {
        try {
            updateValues = _.pick(updateValues, this.updatableFields);
            return this.updateOne(filter, updateValues);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateOne(filter = {}, setData = {}) {
        let query = supabase.from(this.entityName).update(setData);
        Object.entries(filter).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async softDelete(id, softDeleteField = 'deleted_at') {
        return this.updateOne({ id }, { [softDeleteField]: new Date() });
    }

    async updateMany(filters, updateValues) {
        return this.updateOne(filters, updateValues);
    }

    async paginate(requestedData = {}, pagination = true) {
        try {
            let conditions = await this.parseFilters(requestedData);
            requestedData.limit = parseInt(requestedData.limit) || PaginationConstants.LIMIT;
            let page = parseInt(requestedData.page) || PaginationConstants.PAGENUMBER;
            let skipCount = (page - 1) * requestedData.limit;
            let options = { limit: requestedData.limit, offset: skipCount, sort: {} };

            if (requestedData.sort_by && requestedData.sort_order) {
                options.sort[requestedData.sort_by] = requestedData.sort_order;
            }
            return this.search(conditions, this.listingFields, options, pagination);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async bcryptToken(password) {
        try {
            return await bcrypt.hash(String(password), this.AuthConstants.SALTROUNDS);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async generateCryptoToken() {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(20, (err, buf) => {
                if (err) reject(err);
                resolve(buf.toString('hex'));
            });
        });
    }

    async aggregate(options = []) {
        try {
            let query = supabase.from(this.entityName).select('*');
            options.forEach(([key, value]) => {
                query = query.eq(key, value);
            });
            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    handleError(err) {
        this.log({ level: "error", data: { err } });
        return Promise.reject(err);
    }

    parseFilters() {
        return {};
    }
}

module.exports = BaseService;
