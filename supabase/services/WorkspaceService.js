const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const { v4: uuid } = require("uuid");

class WorkspaceService extends BaseService {
    constructor() {
        super();
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.entityName = 'Workspace';
        this.listingFields = ["id", "name", "description", "status"];
        this.updatableFields = ["name", "description", "status", "chatbotSetting", "sentimentSetting", "qualityAssuranceSetting"];
    }

    async createWorkspace(workspaceData) {
        try {
            workspaceData.id = uuid();
            const { data, error } = await this.supabase
                .from('workspaces')
                .insert(workspaceData)
                .select();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getWorkspaceDetails(id) {
        try {
            const { data, error } = await this.supabase
                .from('workspaces')
                .select()
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateWorkspace(id, updateValues) {
        try {
            const { error } = await this.supabase
                .from('workspaces')
                .update(updateValues)
                .eq('id', id);
            if (error) throw error;
            return { message: "Updated successfully" };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteWorkspace(id) {
        try {
            const { error } = await this.supabase
                .from('workspaces')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { message: "Deleted successfully" };
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = WorkspaceService;
