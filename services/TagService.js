const Promise = require("bluebird");
const errors = require("../errors");
const TagUtility = require('../db/utilities/TagUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");

class TagService extends BaseService {

    constructor(fields=null, dependencies=null) {
        super();
        this.utilityInst = new TagUtility();
        this.entityName = 'Tag';
        this.listingFields = ["-_id"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = [ "name", "description", "archiveAt"];
    }

    async createTag(data) {
        try {
            return this.create(data);
        } catch(err) {
            return this.handleError(err);
        }
    }

    async updateTag(tag_id, updateValues) {
        try {
            await this.update({id: tag_id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }

    async deleteTag(id) {
        try {
            let res = await this.softDelete(id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, clientId, archived }) {
        let filters = {};
        filters.clientId = clientId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
        }

        if (archived) {
            filters.archiveAt = { $ne: null };
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

module.exports = TagService;
