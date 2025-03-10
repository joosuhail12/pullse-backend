const Promise = require("bluebird");
const errors = require("../errors");
const _ = require("lodash");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class TeamService {
    constructor() {
        this.entityName = "teams";
        this.memberTable = "team_members";
        this.listingFields = [
            "id",
            "name",
            "icon",
            "description",
            "workspaceId",
            "clientId",
            "createdBy",
            "channels",
            "routingStrategy",
            "maxTotalTickets",
            "maxOpenTickets",
            "maxActiveChats",
            "officeHours",
            "holidays",
            "createdAt",
            "updatedAt",
        ];
    }

    async createTeam(data) {
        const { data: createdTeam, error } = await supabase
            .from(this.entityName)
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        return createdTeam;
    }

    async listTeams(filters) {
        try {
            let query = supabase
                .from(this.entityName)
                .select(`
                    id, name, icon, description, workspaceId, clientId, createdBy, channels, routingStrategy,
                    maxTotalTickets, maxOpenTickets, maxActiveChats, officeHours, holidays, createdAt, updatedAt,
                    teamMembers (users (id, name, email))
                `)
                .eq("clientId", filters.clientId)
                .eq("workspaceId", filters.workspaceId)
                .is("deletedAt", null)
                .order("createdAt", { ascending: false });

            if (filters.name) {
                query = query.ilike("name", `%${filters.name}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Transform response to ensure `teamMembers` is an array
            return data.map(team => ({
                ...team,
                teamMembers: team.teamMembers ? team.teamMembers.map(m => m.users) : []
            }));

        } catch (error) {
            console.log(error);
            this.handleError(error);
        }
    }





    async getDetails(id, workspaceId, clientId) {
        try {
            const { data: team, error } = await supabase
                .from(this.entityName)
                .select(`
                    id, name, icon, description, workspaceId, clientId, createdBy, channels, routingStrategy,
                    maxTotalTickets, maxOpenTickets, maxActiveChats, officeHours, holidays, createdAt, updatedAt,
                    teamMembers (users (id, name, email))
                `)
                .eq("id", id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .is("deletedAt", null)
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
                }
                throw error;
            }

            return {
                ...team,
                teamMembers: team.teamMembers ? team.teamMembers.map(m => m.users) : []
            };
        } catch (error) {
            console.log(error);
            this.handleError(error);
        }
    }


    async updateTeam({ id, workspaceId, clientId }, updateValues) {
        const existingTeam = await this.getDetails(id, workspaceId, clientId);

        const { error } = await supabase
            .from(this.entityName)
            .update(updateValues)
            .eq("id", existingTeam.id);

        if (error) throw error;
        return { message: "Team updated successfully" };
    }

    async deleteTeam({ id, workspaceId, clientId }) {
        const existingTeam = await this.getDetails(id, workspaceId, clientId);

        const { error } = await supabase
            .from(this.entityName)
            .update({ deletedAt: new Date().toISOString() })
            .eq("id", existingTeam.id);

        if (error) throw error;
        return { message: "Team deleted successfully" };
    }

    /** 
     * Add multiple members to a team 
     */
    async addMembersToTeam(teamId, userIds, role = "member") {
        const members = userIds.map(userId => ({
            team_id: teamId,
            user_id: userId,
            role
        }));

        const { data, error } = await supabase
            .from(this.memberTable)
            .insert(members)
            .select();

        if (error) throw error;
        return data;
    }

    /** 
     * Get all members of a team 
     */
    async getTeamMembers(teamId) {
        const { data, error } = await supabase
            .from(this.memberTable)
            .select("user_id, role, added_at, users(name, email)")
            .eq("team_id", teamId)
            .order("added_at", { ascending: true });

        if (error) throw error;
        return data;
    }

    /** 
     * Remove a member from a team 
     */
    async removeMemberFromTeam(teamId, userId) {
        const { error } = await supabase
            .from(this.memberTable)
            .delete()
            .eq("team_id", teamId)
            .eq("user_id", userId);

        if (error) throw error;
        return { message: "Member removed from team successfully" };
    }
}

module.exports = TeamService;
