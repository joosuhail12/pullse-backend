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
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
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
            let { data, error } = await this.supabase
                .from("cannedresponses")
                .select("*")
                .eq("id", id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
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
                .from("cannedresponses")
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
                .from("cannedresponses")
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
