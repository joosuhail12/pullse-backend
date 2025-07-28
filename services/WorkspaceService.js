const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const config = require("../config");
const jwt = require('jsonwebtoken');
const { createClient } = require("@supabase/supabase-js");
const WorkspacePermissionService = require("./WorkspacePermissionService");

class WorkspaceService extends BaseService {
    constructor(fields = null, dependencies = {}) {
        super();
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.entityName = "workspace";
        // this.AuthService = AuthService;
        this.listingFields = ["id", "name"];
        this.updatableFields = [
            "name",
            "description",
            "chatbotSetting",
            "sentimentSetting",
            "qualityAssuranceSetting",
            "status",
        ];
    }

    async createWorkspace(workspaceData) {
        try {
            let { name, description, createdBy, clientId } = workspaceData;
            let { data: workspace } = await this.supabase
                .from("workspace")
                .select("*")
                .eq("name", name)
                .eq("clientId", clientId)
                .maybeSingle();

            if (workspace) {
                return Promise.reject(
                    new errors.NotFound(this.entityName + " Already exist.")
                );
            }

            let { data: newWorkspace, error: createError } = await this.supabase
                .from("workspace")
                .insert([{ name, clientId, description, createdBy }])
                .select()
                .single();
            if (createError) throw createError;

            let { data: client } = await this.supabase
                .from("users")
                .select("id")
                .eq("clientId", clientId)
                .maybeSingle();

            const data = {
                userId: client.id,
                clientId,
                workspaceId: newWorkspace.id,
                role: "ORGANIZATION_ADMIN",
                createdBy,
            };
            const workspacePermission = new WorkspacePermissionService();
            await workspacePermission.createWorkspacePermission(data);
            return newWorkspace;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, clientId, userId) {
        try {
            let { data: workspace } = await this.supabase
                .from("workspace")
                .select("*")
                .eq("id", id)
                .eq("clientId", clientId)
                .maybeSingle();

            if (!workspace) {
                return Promise.reject(
                    new errors.NotFound(this.entityName + " not found.")
                );
            }

            let { data: workspacePermissions } = await this.supabase
                .from("workspacePermissions")
                .select("*")
                .eq("clientId", clientId)
                .eq("workspaceId", id)
                .eq("userId", userId);

            let email = `${workspace.id}@${config.app.email_domain}`;
            const clientToken = jwt.sign(
                { client: Buffer.from(`${workspace.id}:${clientId}`).toString('base64') },
                process.env.JWT_SECRET || '$$SUPER_SECRET_JWT_SECRET!@#$%5'
            );

            return { ...workspace, workspacePermissions, email, clientToken };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getMyWorkspace({ userId, clientId }) {
        try {
            // Fetch workspace permissions first
            let { data: workspacePermissions, error: permissionsError } = await this.supabase
                .from("workspacePermissions")
                .select("workspaceId")
                .eq("userId", userId)

            if (permissionsError) throw permissionsError;

            // Extract workspaceIds into an array
            const workspaceIds = workspacePermissions.map(wp => wp.workspaceId);

            if (workspaceIds.length === 0) {
                return []; // Return empty array if the user has no workspaces
            }

            // Now fetch workspaces using the extracted IDs
            let { data: workspaces, error: workspaceError } = await this.supabase
                .from("workspace")
                .select(
                    "id, name, status, description, clientId, createdBy(id, fName, lName, email), createdAt"
                )
                .in("id", workspaceIds)
                .is("deletedAt", null);

            if (workspaceError) throw workspaceError;

            return workspaces;
        } catch (err) {
            return this.handleError(err);
        }
    }



    async updateWorkspace({ id, clientId }, updateValues) {
        try {
            if (updateValues?.name) {
                let { data: workspace } = await this.supabase
                    .from("workspace")
                    .select("*")
                    .eq("name", updateValues.name)
                    .eq("clientId", clientId)
                    .maybeSingle();

                if (workspace) {
                    return Promise.reject(
                        new errors.NotFound(this.entityName + " Already exist.")
                    );
                }
            }

            let { error } = await this.supabase
                .from("workspace")
                .update(updateValues)
                .eq("id", id)
                .eq("clientId", clientId);

            if (error) throw error;
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async updateChatbotSetting({ id, clientId }, chatbotSetting) {
        return this.updateWorkspace({ id, clientId }, { chatbotSetting });
    }

    async updateSentimentSetting({ id, clientId }, sentimentSetting) {
        return this.updateWorkspace({ id, clientId }, { sentimentSetting });
    }

    async updateQualityAssuranceSetting({ id, clientId }, qualityAssuranceSetting) {
        return this.updateWorkspace({ id, clientId }, { qualityAssuranceSetting });
    }

    async deleteWorkspace({ id, clientId }) {
        try {
            let { error } = await this.supabase
                .from("workspace")
                .update({ deletedAt: new Date() })
                .eq("id", id)
                .eq("clientId", clientId);

            if (error) throw error;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getWorkspaceDetails(workspaceId, clientId) {
        try {
            // Fetch workspace details
            let { data: workspace, error: workspaceError } = await this.supabase
                .from("workspace")
                .select("id, name, description, clientId")
                .eq("id", workspaceId)
                .eq("clientId", clientId)
                .single();

            if (workspaceError) throw workspaceError;
            if (!workspace) return null; // If no workspace found, return null

            // Fetch workspace permissions
            let { data: workspacePermissions, error: permissionsError } = await this.supabase
                .from("workspacePermissions")
                .select("id, userId, role, access")
                .eq("workspaceId", workspaceId)

            if (permissionsError) throw permissionsError;

            // Extract userIds from permissions
            const userIds = workspacePermissions.map(wp => wp.userId);

            // Fetch user details only if userIds exist
            let users = [];
            if (userIds.length > 0) {
                let { data: userData, error: userError } = await this.supabase
                    .from("users")
                    .select("id, fName, lName, email")
                    .in("id", userIds);

                if (userError) throw userError;
                users = userData;
            }

            // Map users to workspacePermissions
            workspacePermissions = workspacePermissions.map(permission => ({
                ...permission,
                user: users.find(user => user.id === permission.userId) || null
            }));

            // Attach permissions to workspace
            return {
                ...workspace,
                workspacePermissions
            };
        } catch (err) {
            return this.handleError(err);
        }
    }


    parseFilters({ name, createdFrom, createdTo, clientId }) {
        let filters = { clientId };

        if (name) {
            filters.name = name;
        }

        if (createdFrom || createdTo) {
            filters.createdAt = {};
            if (createdFrom) filters.createdAt["gte"] = createdFrom;
            if (createdTo) filters.createdAt["lt"] = createdTo;
        }

        return filters;
    }
}

module.exports = WorkspaceService;
