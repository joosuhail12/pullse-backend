const { createClient } = require('@supabase/supabase-js');
const Promise = require("bluebird");
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const config = require("../config");
const UserRoles = require('../constants/UserRoles');

class CannedResponseService extends BaseService {
    constructor() {
        super();
        this.entityName = 'cannedresponses';
        this.listingFields = ["id", "name", "message", "numberOfTimesUsed", "shortcut", "category", "isShared"];
        this.updatableFields = ["name", "shortcut", "message", "category", "isShared", "sharedTeams", "archiveAt", "updatedAt"];
    }

    async createCannedResponse(cannedResponseData) {
        try {
            let { name, clientId, workspaceId, createdBy, message, shortcut, category, isShared, sharedTeams } = cannedResponseData;

            if (!name || !message || !shortcut || !category || isShared === undefined || (isShared && sharedTeams.length === 0)) {
                return Promise.reject(new errors.BadRequest("Missing required fields."));
            }

            let existingCannedResponse = await this.findOne({ shortcut, clientId, archiveAt: null });

            if (existingCannedResponse) {
                return Promise.reject(new errors.Conflict(this.entityName + " already exist."));
            }

            const cannedResponse = {
                name,
                clientId,
                workspaceId,
                createdBy,
                message,
                shortcut,
                category,
                isShared,
            };

            let { data, error: insertError } = await this.supabase
                .from("cannedresponses")
                .insert(cannedResponse)
                .select()
                .single();

            if (insertError) {
                return Promise.reject(new errors.BadRequest("Error creating canned response."));
            }

            if (isShared && sharedTeams) {
                let sharedTeamsData = await Promise.all(sharedTeams.map(async (team) => {
                    let teamInDb = await this.supabase.from("teams").select("id").eq("workspaceId", workspaceId).eq("clientId", clientId).eq("id", team.teamId).single();
                    console.log(teamInDb.data);

                    if (!teamInDb?.data?.id) {
                        return Promise.reject(new errors.BadRequest("Team not found."));
                    }

                    return {
                        cannedresponsesId: data.id,
                        teamId: team.teamId,
                        typeOfSharing: team.typeOfSharing
                    };
                }));

                let { data: cannedresponseTeamRelation, error: sharedTeamsError } = await this.supabase
                    .from("cannedresponsesteamrelation")
                    .insert(sharedTeamsData);

                if (sharedTeamsError) {
                    return Promise.reject(new errors.BadRequest("Error creating shared teams."));
                }
            }
            return Promise.resolve(data);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            // Step 1: Get canned response (no join)
            let { data: cannedResponse, error: crError } = await this.supabase
                .from("cannedresponses")
                .select("*")
                .eq("id", id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .single();

            if (crError || !cannedResponse) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }

            // Step 2: Get all team relations for this canned response
            const { data: relations, error: relError } = await this.supabase
                .from("cannedresponsesteamrelation")
                .select("teamId, typeOfSharing")
                .eq("cannedresponsesId", id);

            if (relError) {
                return Promise.reject(new errors.DBError("Error fetching team relations."));
            }

            // Step 3: Get all team details
            let sharedTeams = [];
            if (relations && relations.length > 0) {
                const teamIds = relations.map(r => r.teamId);
                const { data: teams, error: teamError } = await this.supabase
                    .from("teams")
                    .select("id, name")
                    .in("id", teamIds);

                if (teamError) {
                    return Promise.reject(new errors.DBError("Error fetching teams."));
                }

                // Map teamId to team details
                const teamMap = {};
                (teams || []).forEach(t => { teamMap[t.id] = t; });

                // Combine relation and team details
                sharedTeams = relations.map(rel => ({
                    ...rel,
                    ...teamMap[rel.teamId] // adds id, name
                }));
            }

            // Step 4: Attach to response
            cannedResponse.sharedTeams = sharedTeams;

            return cannedResponse;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateCannedResponse({ id, workspaceId, clientId }, updateValues) {
        try {
            const { name, message, shortcut, category, isShared, sharedTeams } = updateValues;
            let newValuesCannedResponse = {};

            if (!name && !message && !shortcut && !category && isShared === undefined && sharedTeams === undefined) return Promise.reject(new errors.BadRequest("No fields to update."));

            if (!id) return Promise.reject(new errors.BadRequest("Canned response id is required"));

            const cannedResponseDetails = await this.getDetails(id, workspaceId, clientId);
            if (!cannedResponseDetails) return Promise.reject(new errors.BadRequest("Canned response not found"));

            if (name) newValuesCannedResponse.name = name;
            if (message) newValuesCannedResponse.message = message;
            if (shortcut) newValuesCannedResponse.shortcut = shortcut;
            if (category) newValuesCannedResponse.category = category;
            if (isShared !== undefined) newValuesCannedResponse.isShared = isShared;

            let { newData, error } = await this.supabase
                .from("cannedresponses")
                .update(newValuesCannedResponse)
                .eq("id", id);

            if (error) return Promise.reject(new errors.BadRequest("Error updating canned response."));

            if (isShared != undefined && !isShared) {
                // Delete all team relations her

                let { error: deleteError } = await this.supabase
                    .from("cannedresponsesteamrelation")
                    .delete()
                    .eq("cannedresponsesId", id);

                if (deleteError) return Promise.reject(new errors.BadRequest("Error deleting shared teams relation."));

            } else if (sharedTeams !== undefined && (cannedResponseDetails.isShared && sharedTeams.length > 0)) {
                try {
                    await Promise.all(sharedTeams.map(async (team) => {
                        let teamInDb = await this.supabase
                            .from("teams")
                            .select("id")
                            .eq("workspaceId", workspaceId)
                            .eq("clientId", clientId)
                            .eq("id", team.teamId)
                            .single();

                        if (!teamInDb?.data?.id) {
                            throw new errors.BadRequest("Team not found.");
                        }

                        if (team.action === 'add') {
                            await this.supabase
                                .from("cannedresponsesteamrelation")
                                .insert({
                                    cannedresponsesId: id,
                                    teamId: team.teamId,
                                    typeOfSharing: team.typeOfSharing
                                });
                        } else if (team.action === 'update') {
                            await this.supabase
                                .from("cannedresponsesteamrelation")
                                .update({
                                    typeOfSharing: team.typeOfSharing
                                })
                                .eq("cannedresponsesId", id)
                                .eq("teamId", team.teamId);
                        } else if (team.action === 'remove') {
                            await this.supabase
                                .from("cannedresponsesteamrelation")
                                .delete()
                                .eq("cannedresponsesId", id)
                                .eq("teamId", team.teamId);
                        }
                    }));
                } catch (error) {
                    return Promise.reject(new errors.BadRequest("Error updating team relations."));
                }
            }

            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    /**
     * Replace all teams for a canned response (delete all, then insert new)
     */
    async updateCannedResponseTeams(id, workspaceId, clientId, teamIds, typeOfSharing = 'view') {
        if (!id || !workspaceId || !clientId || !Array.isArray(teamIds)) {
            throw new errors.BadRequest('Missing required fields.');
        }
        // 1. Delete all existing relations
        await this.supabase
            .from('cannedresponsesteamrelation')
            .delete()
            .eq('cannedresponsesId', id);
        // 2. Insert new relations
        if (teamIds.length > 0) {
            const now = new Date().toISOString();
            const rows = teamIds.map(teamId => ({
                cannedresponsesId: id,
                teamId,
                typeOfSharing: typeOfSharing || 'view',
                createdAt: now,
                updatedAt: now
            }));
            const { error } = await this.supabase
                .from('cannedresponsesteamrelation')
                .insert(rows);
            if (error) throw new errors.DBError(error.message);
        }
        return { success: true };
    }

    /**
     * Get all teams for a canned response
     */
    async getCannedResponseTeams(id, workspaceId, clientId) {
        if (!id) throw new errors.BadRequest('Missing canned response id');
        const { data, error } = await this.supabase
            .from('cannedresponsesteamrelation')
            .select('teamId, typeOfSharing')
            .eq('cannedresponsesId', id);
        if (error) throw new errors.DBError(error.message);
        return data;
    }

    /**
     * List all canned responses accessible to the current user based on their team memberships
     */
    async listTeamAccessibleCannedResponses(userId, workspaceId, clientId) {
        // 1. Get user's team IDs
        const { data: userTeams, error: teamErr } = await this.supabase
            .from('teamMembers')
            .select('team_id')
            .eq('user_id', userId);
        if (teamErr) throw new errors.DBError(teamErr.message);
        if (!userTeams || userTeams.length === 0) return [];
        const teamIds = userTeams.map(t => t.team_id);
        // 2. Get canned response IDs shared with these teams
        const { data: rels, error: relErr } = await this.supabase
            .from('cannedresponsesteamrelation')
            .select('cannedresponsesId')
            .in('teamId', teamIds);
        if (relErr) throw new errors.DBError(relErr.message);
        if (!rels || rels.length === 0) return [];
        const cannedResponseIds = rels.map(r => r.cannedresponsesId);
        // 3. Fetch canned response details
        const { data: responses, error: respErr } = await this.supabase
            .from('cannedresponses')
            .select('*')
            .in('id', cannedResponseIds)
            .eq('workspaceId', workspaceId)
            .eq('clientId', clientId)
            .is('archiveAt', null);
        if (respErr) throw new errors.DBError(respErr.message);
        return responses;
    }

    async deleteCannedResponse({ id, workspaceId, clientId }) {
        try {
            let { error } = await this.supabase
                .from("cannedresponses")
                .update({ archiveAt: new Date() })
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

    /**
     * Paginate canned responses with user role/team logic
     */
    async paginateWithUser(filters, userId) {
        const { workspaceId, clientId, skip = 0, limit = 20 } = filters;
        // 1. Fetch user roles
        const { data: user, error: userError } = await this.supabase
            .from('users')
            .select('id, roleIds')
            .eq('id', userId)
            .single();
        if (userError) throw userError;
        let roleNames = [];
        if (user && user.roleIds) {
            // roleIds may be a single id or array
            const roleIdArr = Array.isArray(user.roleIds) ? user.roleIds : [user.roleIds];
            const { data: roles, error: rolesError } = await this.supabase
                .from('userRoles')
                .select('name')
                .in('id', roleIdArr);
            if (rolesError) throw rolesError;
            roleNames = (roles || []).map(r => r.name);
        } else {
            // Fallback: check workspacePermissions for this user and workspace
            const { data: perms, error: permsError } = await this.supabase
                .from('workspacePermissions')
                .select('role')
                .eq('userId', userId)
                .eq('workspaceId', workspaceId)
                .single();
            if (permsError && permsError.code !== 'PGRST116') throw permsError;
            if (perms && perms.role) {
                roleNames = [perms.role];
            }
        }
        // 2. If org admin, return all for workspace/client
        if (roleNames.includes(UserRoles.organizationAdmin)) {
            const { data, error } = await this.supabase
                .from('cannedresponses')
                .select('*')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('archiveAt', null)
                .range(skip, skip + limit - 1);
            if (error) throw error;
            return data;
        }
        // 3. If not org admin, fetch team ids for user
        const { data: teamRows, error: teamErr } = await this.supabase
            .from('teamMembers')
            .select('team_id')
            .eq('user_id', userId);
        if (teamErr) throw teamErr;
        const teamIds = (teamRows || []).map(t => t.team_id);
        if (!teamIds.length) return [];
        // 4. Get canned response ids shared with these teams
        const { data: rels, error: relErr } = await this.supabase
            .from('cannedresponsesteamrelation')
            .select('cannedresponsesId')
            .in('teamId', teamIds);
        if (relErr) throw relErr;
        const cannedResponseIds = (rels || []).map(r => r.cannedresponsesId);
        if (!cannedResponseIds.length) return [];
        // 5. Fetch canned responses
        const { data: responses, error: respErr } = await this.supabase
            .from('cannedresponses')
            .select('*')
            .in('id', cannedResponseIds)
            .eq('workspaceId', workspaceId)
            .eq('clientId', clientId)
            .is('archiveAt', null)
            .range(skip, skip + limit - 1);
        if (respErr) throw respErr;
        return responses;
    }
}

module.exports = CannedResponseService;
