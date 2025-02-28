const { createClient } = require('@supabase/supabase-js');
const Promise = require("bluebird");
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const config = require("../config");

class CannedResponseService extends BaseService {
    constructor() {
        super();
        this.entityName = 'cannedresponses';
        this.listingFields = ["id", "name", "description", "message"];
        this.updatableFields = ["name", "description", "message"];
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }

    async createCannedResponse(cannedResponseData) {
        try {
            let { name, clientId, workspaceId } = cannedResponseData;
            let { data: existingResponse, error } = await this.supabase
                .from("cannedresponses")
                .select("id")
                .ilike("name", name)
                .eq("clientId", clientId)
                .eq("workspaceId", workspaceId)
                .single();

            if (existingResponse) {
                return Promise.reject(new errors.Conflict(`${this.entityName} already exists.`));
            }

            let { data, error: insertError } = await this.supabase
                .from("cannedresponses")
                .insert(cannedResponseData)
                .select()
                .single();

            if (insertError) throw insertError;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let { data, error } = await this.supabase
                .from("cannedresponses")
                .select("*")
                .eq("id", id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .single();

            if (!data) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateCannedResponse({ id, workspaceId, clientId }, updateValues) {
        try {
            await this.getDetails(id, workspaceId, clientId);
            let { error } = await this.supabase
                .from("cannedresponses")
                .update(updateValues)
                .eq("id", id);
            
            if (error) throw error;
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteCannedResponse({ id, workspaceId, clientId }) {
        try {
            await this.getDetails(id, workspaceId, clientId);
            let { error } = await this.supabase
                .from("cannedresponses")
                .update({ deleted_at: new Date() })
                .eq("id", id);
            
            if (error) throw error;
            return Promise.resolve();
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = {};
        filters.workspaceId = workspaceId;
        filters.clientId = clientId;

        if (name) {
            filters.name = name;
        }

        if (createdFrom || createdTo) {
            filters.created_at = {};
            if (createdFrom) filters.created_at.gte = createdFrom;
            if (createdTo) filters.created_at.lte = createdTo;
        }

        return filters;
    }
}

module.exports = CannedResponseService;
