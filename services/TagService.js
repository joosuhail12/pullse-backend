const Promise = require("bluebird");
const errors = require("../errors");
const TagUtility = require("../db/utilities/TagUtility");
const BaseService = require("./BaseService");
const TagHistoryService = require("./TagHistoryService");
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
            await this.create(data);
            return this.getTags();
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateTag(tag_id, updateValues) {
        try {
            await this.update({ id: tag_id }, updateValues);
            return this.getTags();
        } catch (e) {
            return this.handleError(e);
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

    async getTags() {
        const { data, error } = await this.supabase
            .from(this.entityName)
            .select("id, name, description, createdAt, color, lastUsed");

        if (error) throw error;

        const tags = await Promise.all(data.map(async (tag) => {
            const { data: counts, error: countError } = await this.supabase.rpc("get_tag_counts", { tagIdInput: tag.id });

            return {
                ...tag,
                counts: {
                    tickets: counts?.[0]?.tickets || 0,
                    contacts: counts?.[0]?.contacts || 0,
                    companies: counts?.[0]?.companies || 0,
                }
            };
        }));


        return tags;
    }


    async getTagList(requestedData = {}) {
        try {
            const data = await this.paginate(requestedData);
            const tags = await Promise.map(data, async (tag) => {
                return await this.getTagDetails(tag.id);
            });
            return tags;
        } catch (err) {
            return this.handleError(err);
        }
    }


    async getTagDetails(tagId) {
        try {
            const tagHistoryService = new TagHistoryService();

            // Fetch tag basic details
            const { data: tagData, error: tagError } = await this.supabase
                .from(this.entityName)
                .select("id, name, description, createdAt, color, lastUsed")
                .eq("id", tagId)
                .single();

            if (tagError) throw tagError;
            if (!tagData) {
                console.warn(`No data found for tag ID: ${tagId}`);
                return null;
            }

            // Fetch counts
            const countsData = await tagHistoryService.getTagCounts(tagId);

            // Fetch history
            const tagHistory = await tagHistoryService.getTagHistory(tagId);

            return {
                ...tagData,
                trend: this.calculateTrend(tagHistory), // ✅ Now safe
                counts: {
                    tickets: countsData?.tickets || 0,
                    contacts: countsData?.contacts || 0,
                    companies: countsData?.companies || 0,
                },
                history: tagHistory, // ✅ Always an array
            };
        } catch (err) {
            return this.handleError(err);
        }
    }






    calculateTrend(history) {
        if (!Array.isArray(history) || history.length < 2) {
            return "stable"; // Default if there's not enough data
        }

        const last = history[history.length - 1]?.total || 0;
        const prev = history[history.length - 2]?.total || 0;

        return last > prev ? "increasing" : last < prev ? "decreasing" : "stable";
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
