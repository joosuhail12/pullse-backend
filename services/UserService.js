const _ = require("lodash");
const Promise = require("bluebird");
const UserUtility = require('../db/utilities/UserUtility');
const BaseService = require("./BaseService");
const errors = require("../errors");
const WorkspaceService = require("./WorkspaceService");
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class UserService extends BaseService {

    constructor(fields = null, dependencies = null) {
        super();
        this.entityName = "users";
        this.utilityInst = new UserUtility();
        this.WorkspaceService = WorkspaceService;
        this.supabase = supabase;
        this.listingFields = ["id", "name", "roleIds", "status", "teamId", "createdBy", "created_at", "lastLoggedInAt"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = ["fName", "lName", "name", "roleIds", "teamId", "status", "defaultWorkspaceId"];
    }

    async createUser({ fName, lName, email, roleIds = [], confirmPassword, password, createdBy, clientId, defaultWorkSpace = null }) {
        try {
            let name = this.name(fName, lName);
            // Step 1: Validate Password Confirmation
            if (confirmPassword && confirmPassword !== password) {
                return new errors.BadRequest("Confirm password and password do not match.");
            }
    
            // Step 2: Hash the Password
            password = await this.bcryptToken(password);
    
            // Step 3: Ensure roleIds is stored as an array (PostgreSQL expects an array format)
            roleIds = roleIds.length > 0 ? roleIds : []; // Ensure empty array if not provided
    
            // Step 4: Insert User into Supabase
            const { data: user, error: userError } = await this.supabase
                .from("users")
                .insert([
                    {
                        fName,
                        lName,
                        name,
                        email,
                        password,
                        roleIds, // Ensure this is an array
                        createdBy,
                        clientId,
                        defaultWorkspaceId: defaultWorkSpace || null // Ensuring correct null handling
                    }
                ])
                .select("*") // Selecting all fields to confirm insertion
                .single(); // Ensure only one user is returned
    
            // Step 5: Handle Errors
            if (userError) {
                console.error("Supabase Insert Error:", userError);
                if (userError.code === "23505") { // Unique constraint violation
                    return new errors.AlreadyExist("User already exists.");
                }
                throw userError;
            }
    
            return user;
    
        } catch (e) {
            console.error("Error in createUser:", e);
            return Promise.reject(e);
        }
    }
    
    
    async getDetails(id, clientId) {
        try {

            // Step 1: Fetch user details with the correct workspace relation
            let { data: user, error: userError } = await this.supabase
                .from("users")
                .select(`
                    *,
                    workspace:workspace!fk_users_workspace(*),
                    permissions:workspacePermissions(*)
                `)
                .eq("id", id)
                .eq("clientId", clientId)
                .maybeSingle(); // Changed from `single()` to `maybeSingle()`


            if (userError) throw userError;
            if (!user) return Promise.reject(new errors.NotFound(this.entityName + " not found."));

            // Step 2: Ensure user has a workspace
            if (!user.defaultWorkspaceId) {
                console.log("User does not have a default workspace.");
                return user;
            }

            // Step 3: Fetch workspace permissions separately
            let { data: permissions, error: permissionError } = await this.supabase
                .from("workspacePermissions")
                .select("*")
                .eq("workspaceId", user.defaultWorkspaceId)
                .eq("userId", id)
                .maybeSingle();

            if (permissionError) throw permissionError;

            // Step 4: Attach permissions to workspace
            if (user.workspace) {
                user.workspace.permission = permissions || null;
            }

            return user;

        } catch (err) {
            console.error("Error in getDetails:", err);
            return this.handleError(err);
        }
    }


    async getUserDefaultWorkspace(user) {
        try {
            let clientId = user.clientId;
            let defaultWorkspace;
            let inst = new this.WorkspaceService();
            if (!user.defaultWorkspaceId) {
                defaultWorkspace = await inst.findOne({ clientId });
            } else {
                defaultWorkspace = await inst.findOne({ id: user.defaultWorkspaceId, clientId });
            }
            if (!defaultWorkspace) {
                return Promise.reject(new errors.NotFound("User don't have a workspace."));
            }
            return defaultWorkspace;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateUser({ user_id, clientId }, updateValues) {
        try {
            const { error } = await this.supabase.from('users').update(updateValues).match({ id: user_id, clientId });
            if (error) throw error;
            return Promise.resolve();
        } catch (e) {
            console.log("Error in update() of UserService", e);
            return Promise.reject(e);
        }
    }

    async deleteUser(id) {
        try {
            const { error } = await this.supabase.from('users').update({ deleted: true }).eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            return this.handleError(err);
        }
    }

    name(fName, lName) {
        return fName.trim() + ' ' + lName.trim();
    }

    parseFilters({ name, email, createdFrom, roleId, teamId, createdTo, clientId }) {
        let filters = {};
        filters.clientId = clientId;

        if (name) {
            filters.name = name;
        }
        if (email) {
            filters.email = email;
        }
        if (roleId) {
            filters.roleIds = roleId;
        }
        if (teamId) {
            filters.teamId = teamId;
        }
        if (createdFrom) {
            filters.createdAt = { gte: createdFrom };
        }
        if (createdTo) {
            filters.createdAt = { lt: createdTo };
        }

        return filters;
    }
}

module.exports = UserService;
