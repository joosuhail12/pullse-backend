const _ = require("lodash");
const Promise = require("bluebird");
const BaseService = require("./BaseService");
const errors = require("../errors");
const { createClient } = require('@supabase/supabase-js');
console.log(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
const supabase = createClient('https://qplvypinkxzbohbmykei.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwbHZ5cGlua3h6Ym9oYm15a2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMzg1NjUsImV4cCI6MjA1MzgxNDU2NX0.aU1miuCLext0FZjA4KLum9VuoK4GrlKorAJFZgrK-30');

class UserRoleService extends BaseService {
    constructor() {
        super();
        this.entityName = "userRoles";
        this.listingFields = ["id", "name", "createdBy", "created_at"];
        this.updatableFields = ["name", "description", "permissions"];
        this.supabase = supabase;
    }

    async createRole(requestedData = {}) {
        try {
            let roleData = {
                name: requestedData.name,
                description: requestedData.description || null,
                permissions: requestedData.permissions || [],
                createdBy: requestedData.createdBy, // Ensure consistency with Supabase schema
            };

            const { data, error } = await this.supabase.from("userRoles").insert([roleData]).select();
            if (error && Object.keys(error).length > 0) {
                console.log(data, error, roleData, "data, error")
                if (error.code === "23505") {
                    return Promise.reject(new errors.AlreadyExist("Role already exists."));
                }
                throw error;
            }
            console.log(roleData, "roleData")
            const { data: role, error: createRoleError } = await this.supabase
                .from('userRoles')
                .insert([roleData])
                .select()
                .single();
            console.log(role, createRoleError, "role, createRoleError")
            return role;
        } catch (e) {
            console.log("Error in createRole() of UserRoleService", e);
            return Promise.reject(e);
        }
    }

    async updateRole(role_id, updateValues) {
        try {
            const { error } = await this.supabase.from("userRoles").update(updateValues).match({ id: role_id });
            if (error) throw error;
            return Promise.resolve();
        } catch (e) {
            console.log("Error in updateRole() of UserRoleService", e);
            return Promise.reject(e);
        }
    }

    async deleteRole(id) {
        try {
            const { error } = await this.supabase.from("userRoles").update({ deletedAt: new Date() }).match({ id });
            if (error) throw error;
            return true;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async listAvailableRoles({ excludeAdminRoles = true } = {}) {
        try {
            let query = this.supabase
                .from("userRoles")
                .select("id, name, description, permissions, created_at, updated_at")
                .is("deletedAt", null)
                .order("name", { ascending: true });

            const { data, error } = await query;

            if (error) throw error;

            let filtered = data || [];
            if (excludeAdminRoles) { // # ai generated
                filtered = filtered.filter(role => role.name !== "SUPER_ADMIN" && role.name !== "WORKSPACE_ADMIN"); // # ai generated
            }
            return filtered;
        } catch (e) {
            console.log("Error in listAvailableRoles() of UserRoleService", e);
            return Promise.reject(e);
        }
    }
}

module.exports = UserRoleService;
