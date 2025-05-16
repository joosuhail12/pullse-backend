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
            // Step 1: Get cannedresponse and join with cannedresponsesteamrelation
            let { data, error } = await this.supabase
                .from("cannedresponses")
                .select(`
                    *,
                    cannedresponsesteamrelation (
                        teamId,
                        typeOfSharing
                    )`)
                .eq("id", id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .single();

            // Step 2: Handle if no cannedresponse found
            if (!data) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }


            for (let i = 0; i < data.cannedresponsesteamrelation.length; i++) {
                const item = data.cannedresponsesteamrelation[i];
                const teamId = item.teamId;

                if (teamId) {
                    let { data: teamData, error: teamError } = await this.supabase
                        .from("teams")
                        .select("name")
                        .eq("id", teamId)
                        .single();

                    // Step 4: If no team found
                    if (!teamData) {
                        return Promise.reject(new errors.NotFound("Team not found."));
                    }

                    // Step 5: Return the cannedresponse data along with the team details
                    data.cannedresponsesteamrelation[i] = {
                        ...item,
                        name: teamData.name
                    };
                }
            }

            data.sharedTeams = data.cannedresponsesteamrelation;
            delete data.cannedresponsesteamrelation;

            return data;
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
}

module.exports = CannedResponseService;
