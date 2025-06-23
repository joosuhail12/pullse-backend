const Promise = require("bluebird");
const errors = require("../errors");
const _ = require("lodash");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class TeamService {
    constructor() {
        this.entityName = "teams";
        this.memberTable = "teamMembers";
        this.usersTable = "users";
        this.listingFields = [
            "id", "name", "icon", "description", "workspaceId", "clientId", "createdBy", "channels",
            "routingStrategy", "maxTotalTickets", "maxOpenTickets", "maxActiveChats", "officeHours", "holidays",
            "createdAt", "updatedAt"
        ];
    }

    async createTeam(data) {
        try {
            const { members, workspaceId, clientId, ...teamData } = data;
            // remove channels if it has empty objects
            // console.log(teamData, members, workspaceId, clientId, "teamData---")
            if (teamData.channels && Object.keys(teamData.channels).length > 0) {
                teamData.channels = teamData.channels.filter(channel => channel === "email" || channel === "chat");
                teamData.channels.length === 0 && delete teamData.channels
            } else {
                delete teamData.channels
            }
            teamData.workspaceId = workspaceId
            teamData.clientId = clientId

            const { data: createdTeam, error: teamError } = await supabase
                .from(this.entityName)
                .insert([teamData])
                .select(`
                    id, name, icon, description, workspaceId, clientId, createdBy, channels, routingStrategy,
                    maxTotalTickets, maxOpenTickets, maxActiveChats, officeHours, holidays, createdAt, updatedAt
                `)
                .single();

            if (teamError) throw teamError;

            // Fetch available team members
            const { data: availableMembers, error: availableMembersError } = await supabase
                .from(this.usersTable)
                .select("id")
                .is("deletedAt", null);

            if (availableMembersError) throw availableMembersError;

            const selectedMembers = availableMembers.map(user => members.includes(user.id) ? user.id : null).filter(Boolean);
            const memberEntries = selectedMembers.map(userId => ({
                team_id: createdTeam.id,
                user_id: userId
            }));

            if (memberEntries.length > 0) {
                const { error: memberError } = await supabase
                    .from(this.memberTable)
                    .insert(memberEntries);

                if (memberError) throw memberError;
            }

            const { data: fullTeam, error: fetchError } = await supabase
                .from(this.entityName)
                .select(`
                    id, name, icon, description, workspaceId, clientId, createdBy, channels, routingStrategy,
                    maxTotalTickets, maxOpenTickets, maxActiveChats, officeHours, holidays, createdAt, updatedAt,
                    teamMembers (users (id, name, email))
                `)
                .eq("id", createdTeam.id)
                .single();

            if (fetchError) throw fetchError;

            return {
                ...fullTeam,
                teamMembers: fullTeam.teamMembers ? fullTeam.teamMembers.map(m => m.users) : []
            };
        } catch (error) {
            // console.log(error)
            this.handleError(error)
        }
    }


    async listTeams(filters) {
        try {
            let query = supabase
                .from(this.entityName)
                .select(`
                    id, name, icon, description, workspaceId, clientId, createdBy, channels (email:emailAddress), routingStrategy,
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
            // console.log(error);
            this.handleError(error);
        }
    }


    async getDetails(id, workspaceId, clientId) {
        try {
            const { data: team, error } = await supabase
                .from(this.entityName)
                .select(`
                    id, name, icon, description, workspaceId, clientId, createdBy,
                    channels (email:emailAddress),
                    routingStrategy,
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
            // console.log(error);
            this.handleError(error);
        }
    }


    async updateTeam({ id, workspaceId, clientId }, updateValues) {
        try {
            // Extract members from updateValues if present
            const { members, channels, ...teamUpdateValues } = updateValues;

            teamUpdateValues.workspaceId = workspaceId;
            teamUpdateValues.clientId = clientId;

            // update channels   
            if (channels && channels.email && channels.email.length > 0) {
                const { data: channelData, error: channelError } = await supabase
                    .from("emailchannels")
                    .select("id")
                    .eq("emailAddress", channels.email[0])
                    .maybeSingle();

                if (channelError) throw channelError;

                if (channelData) {
                    teamUpdateValues.channels = channelData.id;
                } else {
                    // Email channel doesn't exist, skip setting channels
                    // console.log(`Email channel ${channels.email[0]} not found, skipping channel update`);
                    delete teamUpdateValues.channels;
                }
            } else {
                delete teamUpdateValues.channels;
            }

            // Update the team data without members
            const { error: updateError } = await supabase
                .from(this.entityName)
                .update(teamUpdateValues)
                .eq("id", id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId);

            if (updateError) throw updateError;

            // If members are provided, update them separately
            if (members && Array.isArray(members)) {
                // Delete existing members
                const { error: deleteError } = await supabase
                    .from(this.memberTable)
                    .delete()
                    .eq("team_id", id);

                if (deleteError) throw deleteError;

                // Add new members
                const memberEntries = members.map(userId => ({ team_id: id, user_id: userId }));
                const { error: addError } = await supabase
                    .from(this.memberTable)
                    .insert(memberEntries);

                if (addError) throw addError;
            }

            // Fetch updated team without teamMembers join
            const { data: updatedTeam, error: fetchError } = await supabase
                .from(this.entityName)
                .select(`
                    id, name, icon, description, workspaceId, clientId, createdBy, channels, routingStrategy,
                    maxTotalTickets, maxOpenTickets, maxActiveChats, officeHours, holidays, createdAt, updatedAt
                `)
                .eq("id", id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .is("deletedAt", null)
                .maybeSingle();

            if (fetchError) throw fetchError;

            if (!updatedTeam) {
                return Promise.reject(new errors.NotFound("Team not found after update."));
            }

            // Fetch team members separately by joining with users explicitly
            const { data: teamMembers, error: membersError } = await supabase
                .from(this.memberTable)
                .select(`user_id, users: user_id (id, name, email)`)
                .eq("team_id", id);

            if (membersError) throw membersError;

            return {
                message: "Team updated successfully",
                team: {
                    ...updatedTeam,
                    teamMembers: teamMembers ? teamMembers.map(m => m.users) : []
                }
            };
        } catch (error) {
            // console.log(error, "error---");
            return Promise.reject(this.handleError(error));
        }
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
     * Add a single teammate to a team 
     */
    async addTeammateToTeam(teamId, userId, workspaceId, clientId) {
        try {
            // First verify the team exists and belongs to the client/workspace
            const { data: team, error: teamError } = await supabase
                .from(this.entityName)
                .select("id")
                .eq("id", teamId)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .is("deletedAt", null)
                .single();

            if (teamError) {
                if (teamError.code === "PGRST116") {
                    return Promise.reject(new errors.NotFound("Team not found."));
                }
                throw teamError;
            }

            // Check if user exists and belongs to the same client/workspace
            const { data: user, error: userError } = await supabase
                .from(this.usersTable)
                .select("id")
                .eq("id", userId)
                .eq("clientId", clientId)
                .is("deletedAt", null)
                .single();

            if (userError) {
                if (userError.code === "PGRST116") {
                    return Promise.reject(new errors.NotFound("User not found."));
                }
                throw userError;
            }

            // Check if user is already a member of the team
            const { data: existingMember, error: memberCheckError } = await supabase
                .from(this.memberTable)
                .select("id")
                .eq("team_id", teamId)
                .eq("user_id", userId)
                .single();

            if (memberCheckError && memberCheckError.code !== "PGRST116") {
                throw memberCheckError;
            }

            if (existingMember) {
                return Promise.reject(new errors.BadRequest("User is already a member of this team."));
            }

            // Add the user to the team
            const { data: newMember, error: insertError } = await supabase
                .from(this.memberTable)
                .insert([{
                    team_id: teamId,
                    user_id: userId
                }])
                .select(`
                    id, added_at,
                    users (id, name, email)
                `)
                .single();

            if (insertError) throw insertError;

            return {
                message: "Teammate added successfully",
                member: {
                    id: newMember.id,
                    added_at: newMember.added_at,
                    user: newMember.users
                }
            };
        } catch (error) {
            // console.log(error);
            return Promise.reject(this.handleError(error));
        }
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

    async getAvailableTeamMembers(workspaceId, clientId) {
        try {
            const { data, error } = await supabase
                .from(this.usersTable)
                .select("id, name, email")
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .is("deletedAt", null)
                .order("name", { ascending: true });

            if (error) throw error;

            return data;
        } catch (error) {
            // console.log(error);
            this.handleError(error);
        }
    }

    // Get all teams that a user belongs to
    async getUserTeams(userId, workspaceId, clientId) {
        try {
            // console.log(`Getting teams for user ${userId}`);

            // Query to get all team_ids from teamMembers where user_id = userId
            const { data: userTeamMemberships, error: membershipError } = await supabase
                .from(this.memberTable)
                .select('team_id')
                .eq('user_id', userId);

            if (membershipError) {
                console.error("Error fetching team memberships:", membershipError);
                throw membershipError;
            }

            if (!userTeamMemberships || userTeamMemberships.length === 0) {
                console.log(`User ${userId} doesn't belong to any teams`);
                return [];
            }

            // Extract team IDs
            const teamIds = userTeamMemberships.map(membership => membership.team_id);
            // console.log(`Found ${teamIds.length} teams for user ${userId}:`, teamIds);

            // Fetch team details
            const { data: teams, error: teamsError } = await supabase
                .from(this.entityName)
                .select('id, name, description, icon, workspaceId, clientId')
                .in('id', teamIds)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null);

            if (teamsError) {
                console.error("Error fetching team details:", teamsError);
                throw teamsError;
            }

            // console.log(`Returning ${teams.length} teams for user ${userId}`);
            return teams;
        } catch (error) {
            console.error('Error getting user teams:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    // Get all teammates for a user across all teams
    async getUserTeammates(userId, workspaceId, clientId) {
        try {
            // console.log(`Getting all teammates for user ${userId}`);

            // Step 1: Find all teams the user belongs to
            const { data: userTeamMemberships, error: membershipError } = await supabase
                .from(this.memberTable)
                .select('team_id')
                .eq('user_id', userId);

            if (membershipError) {
                console.error("Error fetching team memberships:", membershipError);
                throw membershipError;
            }

            if (!userTeamMemberships || userTeamMemberships.length === 0) {
                console.log(`User ${userId} doesn't belong to any teams`);
                return [];
            }

            // Extract team IDs
            const teamIds = userTeamMemberships.map(membership => membership.team_id);
            // console.log(`Found ${teamIds.length} teams for user ${userId}`);

            // Step 2: Find all user_ids in these teams (excluding the original user)
            const { data: teammates, error: teammatesError } = await supabase
                .from(this.memberTable)
                .select('user_id')
                .in('team_id', teamIds)
                .neq('user_id', userId);  // Exclude the original user

            if (teammatesError) {
                console.error("Error fetching teammates:", teammatesError);
                throw teammatesError;
            }

            // Extract unique user IDs
            const teammateIds = [...new Set(teammates.map(tm => tm.user_id))];
            // console.log(`Found ${teammateIds.length} unique teammates`);

            if (teammateIds.length === 0) {
                return [];
            }

            // Step 3: Fetch user details for all teammates with role information
            const { data: teammateDetails, error: detailsError } = await supabase
                .from(this.usersTable)
                .select('id, name, email, status, lastLoggedInAt, created_at, avatar, teamId, createdBy, roleIds:userRoles(name)')
                .in('id', teammateIds)
                .eq('clientId', clientId)
                .is('deletedAt', null);
            // .eq('workspaceId', workspaceId)

            if (detailsError) {
                console.error("Error fetching teammate details:", detailsError);
                throw detailsError;
            }

            // Format the response to match expected structure (same as UserHandler pattern)
            const formattedTeammates = teammateDetails.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.roleIds ? user.roleIds.name : null,
                status: user.status,
                teamId: user.teamId,
                createdBy: user.createdBy,
                createdAt: user.created_at,
                lastActive: user.lastLoggedInAt,
                avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`
            }));

            // console.log(`Returning ${formattedTeammates.length} teammates for user ${userId}`);
            return formattedTeammates;
        } catch (error) {
            console.error('Error getting user teammates:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    // Get all teammates/members of a specific team with detailed info
    async getTeamMembersDetailed(teamId, workspaceId, clientId) {
        try {
            // console.log(`Getting detailed team members for team ${teamId}`);

            // First verify the team exists and belongs to the client/workspace
            const { data: team, error: teamError } = await supabase
                .from(this.entityName)
                .select("id")
                .eq("id", teamId)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .is("deletedAt", null)
                .single();

            if (teamError) {
                if (teamError.code === "PGRST116") {
                    return Promise.reject(new errors.NotFound("Team not found."));
                }
                throw teamError;
            }

            // Get all team members with detailed user information
            const { data: teamMembers, error: membersError } = await supabase
                .from(this.memberTable)
                .select(`
                    id, added_at,
                    users (id, name, email, status, lastLoggedInAt, created_at, avatar)
                `)
                .eq("team_id", teamId)
                .order("added_at", { ascending: true });

            if (membersError) {
                console.error("Error fetching team members:", membersError);
                throw membersError;
            }

            // Format the response to match expected structure
            const formattedMembers = teamMembers.map(member => ({
                id: member.users.id,
                name: member.users.name,
                email: member.users.email,
                status: member.users.status || 'active',
                lastActive: member.users.lastLoggedInAt,
                joined: member.added_at,
                avatar: member.users.avatar,
                membershipId: member.id
            }));

            // console.log(`Returning ${formattedMembers.length} team members for team ${teamId}`);
            return formattedMembers;
        } catch (error) {
            console.error('Error getting team members:', error);
            return Promise.reject(this.handleError(error));
        }
    }

    /**
     * Helper method to handle errors
     */
    handleError(error) {
        // console.log(error);
        if (error.code === "PGRST116") {
            return new errors.NotFound(`${this.entityName} not found.`);
        }
        return error;
    }
}

module.exports = TeamService;

