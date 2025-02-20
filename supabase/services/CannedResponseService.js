const { createClient } = require('@supabase/supabase-js');
const Promise = require("bluebird");
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const config = require("../config");

class CannedResponseService extends BaseService {
    constructor() {
        super();
        this.entityName = 'CannedResponse';
        this.listingFields = ["id", "name", "description", "message"];
        this.updatableFields = ["name", "description", "message"];
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }

    async createCannedResponse(cannedResponseData) {
        try {
            let { name, clientId, workspaceId } = cannedResponseData;
            let { data: existingResponse, error } = await this.supabase
                .from("canned_response")
                .select("id")
                .ilike("name", name)
                .eq("client_id", clientId)
                .eq("workspace_id", workspaceId)
                .single();

            if (existingResponse) {
                return Promise.reject(new errors.Conflict(`${this.entityName} already exists.`));
            }

            let { data, error: insertError } = await this.supabase
                .from("canned_response")
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
                .from("canned_response")
                .select("*")
                .eq("id", id)
                .eq("workspace_id", workspaceId)
                .eq("client_id", clientId)
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
                .from("canned_response")
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
                .from("canned_response")
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
        filters.workspace_id = workspaceId;
        filters.client_id = clientId;

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
