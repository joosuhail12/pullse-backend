const Promise = require("bluebird");
const errors = require("../errors");
const TagUtility = require("../db/utilities/TagUtility");
const BaseService = require("./BaseService");
const _ = require("lodash");

class TagService extends BaseService {
    constructor(fields = null, dependencies = null) {
        super();
        this.utilityInst = new TagUtility();
        this.entityName = "tags";
        this.listingFields = ["id", "name", "description", "createdAt", "color", "lastUsed", "trend", "counts", "history", "preview"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = ["name", "description", "archiveAt", "color", "lastUsed", "trend", "counts", "history", "preview"];
    }

    async createTag(data) {
        try {
            return this.create(data);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateTag(tag_id, updateValues) {
        try {
            await this.update({ id: tag_id }, updateValues);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteTag(id) {
        try {
            let res = await this.softDelete(id, 'archiveAt');
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, clientId, archived }) {
        let filters = {};
        filters.clientId = clientId;

        if (name) {
            filters.name = { $ilike: `%${name}%` };
        }

        if (archived) {
            filters.archiveAt = { $ne: null };
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

module.exports = TagService;
