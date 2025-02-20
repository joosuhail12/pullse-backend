const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const config = require("../config");

class UserService {
    constructor() {
        this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
        this.tableName = 'users';
    }

    async createUser({ fName, lName, email, password, roleIds = [], createdBy, clientId, role, defaultWorkspace = '' }) {
        try {
            let name = `${fName.trim()} ${lName.trim()}`;
            let { data, error } = await this.supabase
                .from(this.tableName)
                .insert([{ fName, lName, name, email, password, roleIds, role, createdBy, clientId, defaultWorkspaceId: defaultWorkspace }])
                .select();
            
            if (error) throw error;
            return data;
        } catch (e) {
            console.error("Error in createUser() of UserService", e);
            throw new errors.InternalServerError("Could not create user.");
        }
    }

    async getDetails(id, clientId) {
        try {
            let { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .eq('clientId', clientId)
                .single();
            
            if (error) throw new errors.NotFound("User not found.");
            return data;
        } catch (err) {
            throw this.handleError(err);
        }
    }

    async updateUser({ user_id, clientId }, updateValues) {
        try {
            let { error } = await this.supabase
                .from(this.tableName)
                .update(updateValues)
                .eq('id', user_id)
                .eq('clientId', clientId);
            
            if (error) throw error;
            return { message: "User updated successfully." };
        } catch (e) {
            console.error("Error in updateUser() of UserService", e);
            throw new errors.InternalServerError("Could not update user.");
        }
    }

    async deleteUser(id) {
        try {
            let { error } = await this.supabase
                .from(this.tableName)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { message: "User deleted successfully." };
        } catch (err) {
            throw this.handleError(err);
        }
    }

    parseFilters({ name, email, createdFrom, roleId, teamId, createdTo, clientId }) {
        let filters = {};
        filters.clientId = clientId;

        if (name) filters.name = name;
        if (email) filters.email = email;
        if (roleId) filters.roleIds = roleId;
        if (teamId) filters.teamId = teamId;
        if (createdFrom) filters.createdAt = { gte: createdFrom };
        if (createdTo) filters.createdAt = { lte: createdTo };

        return filters;
    }
}

module.exports = UserService;
