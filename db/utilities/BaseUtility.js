const supabase = require('../supabaseClient');
const errors = require('../../errors');
const { v4: uuid } = require('uuid');

class BaseUtility {
    constructor(tableName) {
        this.tableName = tableName;
    }

    /**
     * Check if a record exists
     */
    async exists(conditions = {}) {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('id')
            .match(conditions)
            .neq('deleted_at', null)
            .limit(1)
            .single();

        if (error) throw new errors.DBError(error.message);
        return !!data;
    }

    /**
     * Find one record
     */
    async findOne(conditions = {}, projection = '*') {
        const { data, error } = await supabase
            .from(this.tableName)
            .select(projection)
            .match(conditions)
            .neq('deleted_at', null)
            .single();

        if (error) throw new errors.DBError(error.message);
        return data;
    }

    /**
     * Find multiple records
     */
    async find(conditions = {}, projection = '*', options = {}) {
        let query = supabase.from(this.tableName).select(projection).match(conditions).neq('deleted_at', null);

        if (options.sort) query = query.order(Object.keys(options.sort)[0], { ascending: options.sort[Object.keys(options.sort)[0]] !== -1 });

        const { data, error } = await query;
        if (error) throw new errors.DBError(error.message);
        return data;
    }

    /**
     * Paginate results
     */
    async paginate(conditions = {}, projection = '*', { page = 1, limit = 10, sort = { created_at: -1 } }) {
        let query = supabase.from(this.tableName).select(projection).match(conditions).neq('deleted_at', null);

        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        if (sort) query = query.order(Object.keys(sort)[0], { ascending: sort[Object.keys(sort)[0]] !== -1 });

        const { data, error } = await query;
        if (error) throw new errors.DBError(error.message);
        return data;
    }

    /**
     * Count documents
     */
    async countDocuments(conditions = {}) {
        const { count, error } = await supabase
            .from(this.tableName)
            .select('*', { count: 'exact', head: true })
            .match(conditions)
            .neq('deleted_at', null);

        if (error) throw new errors.DBError(error.message);
        return count;
    }

    /**
     * Insert a new record
     */
    async insert(record = {}) {
        record.id = record.id || uuid();

        const { data, error } = await supabase.from(this.tableName).insert(record).select();

        if (error) throw new errors.DBError(error.message);
        return data[0];
    }

    /**
     * Insert multiple records
     */
    async insertMany(records = []) {
        records.forEach((record) => {
            record.id = record.id || uuid();
        });

        const { data, error } = await supabase.from(this.tableName).insert(records);

        if (error) throw new errors.DBError(error.message);
        return data;
    }

    /**
     * Update multiple records
     */
    async updateMany(conditions = {}, updatedDoc = {}) {
        const { data, error } = await supabase
            .from(this.tableName)
            .update(updatedDoc)
            .match(conditions)
            .neq('deleted_at', null);

        if (error) throw new errors.DBError(error.message);
        return data;
    }

    /**
     * Update one record
     */
    async updateOne(conditions = {}, updatedDoc = {}) {
        const { data, error } = await supabase
            .from(this.tableName)
            .update(updatedDoc)
            .match(conditions)
            .neq('deleted_at', null)
            .single();

        if (error) throw new errors.DBError(error.message);
        return data;
    }

    /**
     * Find and update a record
     */
    async findOneAndUpdate(conditions = {}, updatedDoc = {}) {
        let existingRecord = await this.findOne(conditions);

        if (!existingRecord) throw new errors.NotFound();

        const { data, error } = await supabase
            .from(this.tableName)
            .update(updatedDoc)
            .match(conditions)
            .neq('deleted_at', null)
            .single();

        if (error) throw new errors.DBError(error.message);
        return data;
    }

    /**
     * Soft delete records
     */
    async deleteMany(conditions = {}) {
        const { data, error } = await supabase
            .from(this.tableName)
            .update({ deleted_at: new Date() })
            .match(conditions)
            .neq('deleted_at', null);

        if (error) throw new errors.DBError(error.message);
        return data;
    }

    async populate(field, rows = []) {
        if (!this.populateFields[field]) {
            throw new errors.Internal(`populate field config not set for ${field} in ${this.constructor.name}.`);
        }
        if (!rows || rows.length === 0) {
            return rows;
        }

        let isArray = Array.isArray(rows);
        let selectFields = this.populateFields[field].getFields || '*';
        let utilityInst = this.populateFields[field].utility;
        let srcField = this.populateFields[field].field;
        let multiple = this.populateFields[field].multiple;

        if (!isArray) {
            if (!rows[srcField]) {
                return rows;
            }
            let srcFieldVal = rows[srcField];
            if (multiple) {
                rows[field] = await utilityInst.find({ id: srcFieldVal });
            } else {
                rows[field] = await utilityInst.findOne({ id: srcFieldVal });
            }
            return rows;
        }

        let srcFieldValues = [];
        let Rows = [];
        for (let row of rows) {
            row[field] = multiple ? [] : {};
            Rows.push(row);
            if (row[srcField]) {
                if (multiple) {
                    srcFieldValues = srcFieldValues.concat(row[srcField]);
                } else {
                    srcFieldValues.push(row[srcField]);
                }
            }
        }

        if (srcFieldValues.length === 0) {
            return Rows;
        }

        let srcData = await utilityInst.find({ id: srcFieldValues }, selectFields);
        if (!srcData || srcData.length === 0) {
            return Rows;
        }

        let srcDataMap = {};
        for (let item of srcData) {
            srcDataMap[item.id] = item;
        }

        for (let row of Rows) {
            let srcFieldVal = row[srcField];
            if (multiple) {
                row[field] = srcFieldVal.map((val) => srcDataMap[val]);
            } else {
                row[field] = srcDataMap[srcFieldVal];
            }
        }

        return Rows;
    }

    /**
     * Aggregate (Supabase doesn't support native aggregation yet)
     */
    async aggregate(options = []) {
        throw new errors.NotImplemented("Aggregation is not natively supported in Supabase. Use PostgreSQL queries instead.");
    }
}

module.exports = BaseUtility;
