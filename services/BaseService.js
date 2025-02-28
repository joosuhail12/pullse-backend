const _ = require('lodash');
const bcrypt = require('bcrypt');
const logger = require('../logger');
const errors = require("../errors");
const config = require('../config');
const crypto = require('crypto');
const AuthConstants = require('../constants/AuthConstants');
const PaginationConstants = require('../constants/PaginationConstants');
const { createClient } = require('@supabase/supabase-js');

class BaseService {
    constructor(tableName) {
        this.entityName = tableName;
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
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
            const { data, error } = await this.supabase.from(this.entityName).insert(record).select("id").single();
            if (error) throw error;
            return { id: data.id };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async search(conditions, fields, options, pagination = true) {
        let query = this.supabase.from(this.entityName).select(fields ? fields.join(", ") : '*');

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
        let query = this.supabase.from(this.entityName).select(fields ? fields.join(", ") : '*').single();
        Object.entries(filter).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async count(filter = {}) {
        let query = this.supabase.from(this.entityName).select('*', { count: 'exact', head: true });
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
        let query = this.supabase.from(this.entityName).update(setData);
        Object.entries(filter).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async softDelete(id, softDeleteField = 'deletedAt') {
        return this.updateOne({ id }, { [softDeleteField]: new Date() });
    }

    async updateMany(filters, updateValues) {
        return this.updateOne(filters, updateValues);
    }

    async paginate(requestedData = {}, pagination = true) {
        try {
            if (!this.supabase) {
                throw new Error("Supabase client is not initialized");
            }

            let conditions = await this.parseFilters(requestedData);
            let query = this.supabase.from(this.entityName).select(this.listingFields ? this.listingFields.join(", ") : '*');
            Object.entries(conditions).forEach(([key, value]) => {
                if (key === "archiveAt" && (this.entityName === "tags" || this.entityName === "tickettopic")) {
                    if (value === null) {
                        query = query.is("archiveAt", null); // ✅ Correctly checking for NULL values
                    } else if (value["$ne"] === null) {
                        query = query.not("archiveAt", "is", null); // ✅ Checking for NOT NULL values
                    }
                } else {
                    query = query.eq(key, value);
                }
            });

            // ✅ Ensure we add `archiveAt IS NULL` **only if it's missing from conditions**
            if (!("archiveAt" in conditions) && (this.entityName === "tags" || this.entityName === "tickettopic")) {
                query = query.is("archiveAt", null);
            }


            if (pagination) {
                const limit = parseInt(requestedData.limit) || PaginationConstants.LIMIT;
                const page = parseInt(requestedData.page) || PaginationConstants.PAGENUMBER;
                const offset = (page - 1) * limit;
                query = query.range(offset, offset + limit - 1);
            }

            if (requestedData.sort_by && requestedData.sort_order) {
                query = query.order(requestedData.sort_by, { ascending: requestedData.sort_order === 'asc' });
            }

            let { data, error } = await query;
            if (error) throw error;
            return data;
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
