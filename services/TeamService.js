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
            // if (teamData.channels && Object.keys(teamData.channels).length > 0) {
            //     teamData.channels = teamData.channels.filter(channel => channel === "email" || channel === "chat");
            //     teamData.channels.length === 0 && delete teamData.channels
            // } else {
            //     delete teamData.channels
            // }
            const emailChannel = teamData.channels?.email?.[0];
            const chatChannel = teamData.channels?.chat;
            delete teamData.channels;
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
            // Simple insertion into teamChannels covering email and chat as per rules
            const emailIds = emailChannel ? [emailChannel] : [];
            const chatIds = chatChannel ? chatChannel.map(ch => (typeof ch === 'string' ? ch : ch?.id)).filter(Boolean) : [];
            if (emailIds.length || chatIds.length) {
                const rows = [];
                for (let i = 0; i < Math.max(emailIds.length, chatIds.length); i++) {
                    const row = { teamId: createdTeam.id };
                    if (i < emailIds.length) row.channelId = emailIds[i];
                    if (i < chatIds.length) row.widgetId = chatIds[i];
                    rows.push(row);
                }
                const { error: insErr } = await supabase.from('teamChannels').insert(rows);
                if (insErr) throw insErr;
            }
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
            console.log(error)
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

            // Build complete channel mapping for all returned teams
            const teamIds = data.map(t => t.id);
            let channelMap = {};
            if (teamIds.length) {
                const { data: tcRows } = await supabase
                    .from('teamChannels')
                    .select('teamId, widget:widgetId(id,name), emailChan:channelId(id,name,emailAddress)')
                    .in('teamId', teamIds);

                if (tcRows) {
                    tcRows.forEach(r => {
                        if (!channelMap[r.teamId]) channelMap[r.teamId] = { chat: [], email: [] };
                        if (r.widget) channelMap[r.teamId].chat.push(r.widget);
                        if (r.emailChan) channelMap[r.teamId].email.push({ name: r.emailChan.name, emailAddress: r.emailChan.emailAddress });
                    });
                }
            }

            return data.map(team => ({
                ...team,
                teamMembers: team.teamMembers ? team.teamMembers.map(m => m.users) : [],
                channels: channelMap[team.id] || { chat: [], email: [] }
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
            // gather chat & email channels for this team
            const { data: chanRows } = await supabase
                .from('teamChannels')
                .select('widget:widgetId(id,name), emailChan:channelId(id,name,emailAddress)')
                .eq('teamId', id);
            // const chatChannels = teamChannels ? teamChannels.map(c => c.widget) : [];
            // get all the teams for this clientId and workspaceId
            const { data: teamsData, error: teamsDataError } = await supabase
                .from('teams')
                .select('id, name')
                .eq('clientId', clientId)
                .eq('workspaceId', workspaceId);
            const teams = teamsData ? teamsData.map(c => c.id) : [];
            //check if any team channel is present for this clientId and workspaceId
            let teamChennelCheckAccess = false;
            const { data: teamChannelCheck, error: teamChannelCheckError } = await supabase
                .from('teamChannels')
                .select('teamId')
                .in('teamId', teams);
            if (teamChannelCheckError) throw teamChannelCheckError;
            if (teamChannelCheck && teamChannelCheck.length > 0) {
                teamChennelCheckAccess = true;
            }

            const chats = [], emails = [];
            if (chanRows) {
                chanRows.forEach(r => {
                    if (r.widget) chats.push(r.widget);
                    if (r.emailChan) emails.push({ name: r.emailChan.name, emailAddress: r.emailChan.emailAddress });
                });
            }

            return {
                ...team,
                teamMembers: team.teamMembers ? team.teamMembers.map(m => m.users) : [],
                channels: { chat: chats, email: emails },
                teamChennelCheckAccess: teamChennelCheckAccess
            };
        } catch (error) {
            console.log(error);
            this.handleError(error);
        }
    }


    async updateTeam({ id, workspaceId, clientId }, updateValues) {
        try {
            // Extract members from updateValues if present
            const { members, channels, ...teamUpdateValues } = updateValues;

            teamUpdateValues.workspaceId = workspaceId;
            teamUpdateValues.clientId = clientId;

            // ----- Simplified channel handling for update -----
            const emailIdsUpd = channels?.email || updateValues.email || [];
            const chatIdsUpd = (channels?.chat || updateValues.chat || []).map(ch => (typeof ch === 'string' ? ch : ch?.id)).filter(Boolean);

            // Update teamData.channels column with first email id if any
            if (emailIdsUpd.length) {
                teamUpdateValues.channels = emailIdsUpd[0];
            } else {
                delete teamUpdateValues.channels;
            }

            // Recreate teamChannels mapping
            await supabase.from('teamChannels').delete().eq('teamId', id);
            const maxLenUpd = Math.max(emailIdsUpd.length, chatIdsUpd.length);
            if (maxLenUpd > 0) {
                const rowsUpd = [];
                for (let i = 0; i < maxLenUpd; i++) {
                    const row = { teamId: id };
                    if (i < emailIdsUpd.length) row.channelId = emailIdsUpd[i];
                    if (i < chatIdsUpd.length) row.widgetId = chatIdsUpd[i];
                    rowsUpd.push(row);
                }
                const { error: insErr2 } = await supabase.from('teamChannels').insert(rowsUpd);
                if (insErr2) throw insErr2;
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
            console.log(error, "error---");
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
    async getUserTeammates(userId, workspaceId, clientId, withCurrentUser = false) {
        try {
            // Check if user is org admin for this workspace
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, roleIds')
                .eq('id', userId)
                .single();
            if (userError) throw userError;
            let isOrgAdmin = false;
            if (user && user.roleIds) {
                const roleIdArr = Array.isArray(user.roleIds) ? user.roleIds : [user.roleIds];
                const { data: roles, error: rolesError } = await supabase
                    .from('userRoles')
                    .select('name')
                    .in('id', roleIdArr);
                if (rolesError) throw rolesError;
                isOrgAdmin = (roles || []).some(r => r.name === 'ORGANIZATION_ADMIN');
            } else {
                // Fallback: check workspacePermissions for this user and workspace
                const { data: perms, error: permsError } = await supabase
                    .from('workspacePermissions')
                    .select('role')
                    .eq('userId', userId)
                    .eq('workspaceId', workspaceId)
                    .single();
                if (permsError && permsError.code !== 'PGRST116') throw permsError;
                if (perms && perms.role && perms.role === 'ORGANIZATION_ADMIN') {
                    isOrgAdmin = true;
                }
            }
            if (isOrgAdmin) {
                // console.log("*********isOrgAdmin", isOrgAdmin);
                // Return all users in the workspace
                const { data: allUsers, error: allUsersError } = await supabase
                    .from(this.usersTable)
                    .select('id, name, email, status, lastLoggedInAt, created_at, avatar, teamId, createdBy, roleIds:userRoles(name)')
                    .eq('clientId', clientId)
                    .is('deletedAt', null);
                if (allUsersError) throw allUsersError;
                return allUsers.map(user => ({
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
            }
            // Step 1: Find all teams the user belongs to
            // console.log("*********userTeamMemberships");
            const { data: userTeamMemberships, error: membershipError } = await supabase
                .from(this.memberTable)
                .select('team_id')
                .eq('user_id', userId);

            if (membershipError) {
                console.error("Error fetching team memberships:", membershipError);
                throw membershipError;
            }

            if (!userTeamMemberships || userTeamMemberships.length === 0) {
                return [];
            }

            // Extract team IDs
            const teamIds = userTeamMemberships.map(membership => membership.team_id);

            // Step 2: Find all user_ids in these teams (conditionally excluding the original user)
            let teammatesQuery = supabase
                .from(this.memberTable)
                .select('user_id')
                .in('team_id', teamIds);

            if (!withCurrentUser) {
                teammatesQuery = teammatesQuery.neq('user_id', userId);  // Exclude the original user
            }

            const { data: teammates, error: teammatesError } = await teammatesQuery;

            if (teammatesError) {
                console.error("Error fetching teammates:", teammatesError);
                throw teammatesError;
            }

            // Extract unique user IDs
            let teammateIds = [...new Set(teammates.map(tm => tm.user_id))];

            // If withCurrentUser is true, ensure the current user is included
            if (withCurrentUser && !teammateIds.includes(userId)) {
                teammateIds.push(userId);
            }

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
     * Get unique teammates associated with the same teams as a ticket (excluding requesting user)
     */
    async getTicketTeammates(ticketId, workspaceId, clientId, excludeUserId) {
        try {
            // 1. Find all team ids linked to this ticket
            const { data: teamRows, error: tErr } = await supabase
                .from('ticket_teams')
                .select('team_id')
                .eq('ticket_id', ticketId);

            if (tErr) throw tErr;
            if (!teamRows || teamRows.length === 0) return [];

            const teamIds = [...new Set(teamRows.map(r => r.team_id))];

            // 2. Fetch members (join to users) excluding current user
            const { data: memberRows, error: mErr } = await supabase
                .from(this.memberTable)
                .select(`user_id, users: user_id (id, name, email, status, lastLoggedInAt, created_at, avatar, teamId, createdBy)`)
                .in('team_id', teamIds)
                .neq('user_id', excludeUserId || null);

            if (mErr) throw mErr;

            if (!memberRows) return [];

            // 3. Deduplicate by user_id
            const uniqueMap = {};
            memberRows.forEach(r => {
                const u = r.users;
                if (u && !uniqueMap[u.id]) {
                    uniqueMap[u.id] = {
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        role: null,
                        status: u.status || 'active',
                        teamId: u.teamId,
                        createdBy: u.createdBy,
                        createdAt: u.created_at,
                        lastActive: u.lastLoggedInAt,
                        avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`
                    };
                }
            });

            return Object.values(uniqueMap);
        } catch (err) {
            console.error('Error getting ticket teammates:', err);
            return Promise.reject(this.handleError(err));
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

