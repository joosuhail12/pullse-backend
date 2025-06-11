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
        this.listingFields = ["id", "name", "roleIds: userRoles(name)", "status", "teamId", "createdBy", "created_at", "lastLoggedInAt", "avatar"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = ["fName", "lName", "name", "roleIds: userRoles(name)", "teamId", "status", "defaultWorkspaceId", "avatar"];
    }

    async createUser({ fName, lName, email, roleIds = [], confirmPassword, password, createdBy, clientId, defaultWorkSpace = null, avatar = null }) {
        try {
            let name = this.name(fName, lName);

            if (confirmPassword && confirmPassword !== password) {
                return new errors.BadRequest("Confirm password and password do not match.");
            }

            if (!avatar) {
                avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
            }

            password = await this.bcryptToken(password);

            // ✅ Handle role IDs - if they're already IDs, use them directly, if they're names, look them up
            let fetchedRoles = [];
            if (roleIds.length > 0) {
                // Check if first element looks like a UUID (ID) or a name
                const firstRole = roleIds[0];
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstRole);

                if (isUUID) {
                    // If they're already IDs, verify they exist and use them
                    const { data, error } = await this.supabase
                        .from("userRoles")
                        .select("id")
                        .in("id", roleIds)
                        .is("deletedAt", null);

                    if (error) throw error;
                    if (!data || data.length === 0) {
                        throw new Error("Invalid role ID(s) provided");
                    }
                    fetchedRoles = roleIds; // Use the provided IDs
                } else {
                    // If they're names, look them up
                    const { data, error } = await this.supabase
                        .from("userRoles")
                        .select("id, name")
                        .in("name", roleIds)
                        .is("deletedAt", null);

                    if (error) throw error;
                    if (!data || data.length === 0) {
                        throw new Error("Invalid role name(s) provided");
                    }
                    fetchedRoles = data.map(role => role.id);
                }
            }

            // Insert User into Supabase
            const { data: user, error: userError } = await this.supabase
                .from("users")
                .insert([{
                    fName,
                    lName,
                    name,
                    email,
                    password,
                    roleIds: fetchedRoles[0] || null, // ✅ Use first role only, not array
                    createdBy,
                    clientId,
                    defaultWorkspaceId: defaultWorkSpace || null,
                    avatar
                }])
                .select("*")
                .single();

            if (userError) {
                console.error("Supabase Insert Error:", userError);
                if (userError.code === "23505") {
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
                    roleIds:userRoles(*),
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


    // async getUserDefaultWorkspace(user) {
    //     try {
    //         let clientId = user.clientId;
    //         let defaultWorkspace;
    //         let inst = new this.WorkspaceService();
    //         if (!user.defaultWorkspaceId) {
    //             defaultWorkspace = await inst.findOne({ clientId });
    //         } else {
    //             defaultWorkspace = await inst.findOne({ id: user.defaultWorkspaceId, clientId });
    //         }
    //         if (!defaultWorkspace) {
    //             return Promise.reject(new errors.NotFound("User don't have a workspace."));
    //         }
    //         return defaultWorkspace;
    //     } catch (err) {
    //         return this.handleError(err);
    //     }
    // }

    async updateUser({ user_id, clientId }, updateValues) {
        try {
            if (updateValues.roleIds && updateValues.roleIds.length > 0) {
                // Check if first element looks like a UUID (ID) or a name
                const firstRole = updateValues.roleIds[0];
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstRole);

                if (isUUID) {
                    // If they're already IDs, verify they exist and use them
                    const { data, error } = await this.supabase
                        .from("userRoles")
                        .select("id")
                        .in("id", updateValues.roleIds)
                        .is("deletedAt", null);

                    if (error) throw error;
                    if (!data || data.length === 0) {
                        throw new Error("Invalid role ID(s) provided");
                    }
                    // Keep the original roleIds since they're already valid IDs
                } else {
                    // If they're names, look them up
                    const { data, error } = await this.supabase
                        .from("userRoles")
                        .select("id, name")
                        .in("name", updateValues.roleIds)
                        .is("deletedAt", null);

                    if (error) throw error;
                    if (!data || data.length === 0) {
                        throw new Error("Invalid role name(s) provided");
                    }
                    updateValues.roleIds = data.map(role => role.id);
                }
            }

            const { error } = await this.supabase
                .from('users')
                .update(updateValues)
                .match({ id: user_id, clientId });

            if (error) throw error;
            return Promise.resolve();

        } catch (e) {
            console.log("Error in updateUser()", e);
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
