const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");

class WorkspacePermissionService extends BaseService {
    constructor() {
        super();
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.entityName = 'WorkspacePermission';
        this.listingFields = ["id", "userId", "workspaceId", "role", "createdBy"];
        this.updatableFields = ["role", "access"];
    }

    async createWorkspacePermission(permissionData) {
        try {
            const { data, error } = await this.supabase
                .from('workspacePermissions')
                .insert(permissionData)
                .select();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id) {
        try {
            const { data, error } = await this.supabase
                .from('workspacePermissions')
                .select()
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateWorkspacePermission(id, updateValues) {
        try {
            const { error } = await this.supabase
                .from('workspacePermissions')
                .update(updateValues)
                .eq('id', id.id);
            if (error) throw error;
            return { message: "Updated successfully" };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteWorkspacePermission(id) {
        try {
            const { error } = await this.supabase
                .from('workspacePermissions')
                .delete()
                .eq('id', id.id);
            if (error) throw error;
            return { message: "Deleted successfully" };
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = WorkspacePermissionService;
