export default class TeamRouterService {
    constructor(supabase, { workspaceId, clientId }, ablyRest) {
      this.sb = supabase;
      this.wsId = workspaceId;
      this.clId = clientId;
      this.ablyRest = ablyRest;
    }

    async updateTicketStatus(ticketId, status, teamIds) {
        try{
        const {data:teams, error:teamError} = await this.sb
            .from('teams')
            .select('id,name')
            .in('id', teamIds);
        if (teamError) throw teamError;

        const { data: ticket, error: tErr } = await this.sb
                .from('tickets')
                .select('*')
                .eq('id', ticketId)
                .single();
        if (tErr) throw tErr;

        const {data:customer, error:cErr} = await this.sb
            .from('customers')
            .select('id, firstname, lastname, email')
            .eq('id', ticket.customerId)
            .single();
        if (cErr) throw cErr;

        const newTicketPayload = {
            id: ticketId,
            ticket_sno: ticketId,
            sno: ticket.sno ?? ticketId,
            subject: ticket.title,
            description: null,
            customer: {
                id: customer.id,
                name: `${customer.firstname} ${customer.lastname}`,
                email: customer.email,
                phone: null,
            },
            customerId: customer.id,
            status:"Open",
            priority:"Low",
            assignee:null,
            assignedTo:null,
            assignedToUser:null,
            teamIds:teamIds,
            team:teams,
            teams: teams,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isUnread: false,
            hasNotification: false,
            notificationType: null,
            recipients: [],
            customFields: [],
            topicIds: [],
            mentionIds: [],
            messages: [],
            }
            this.ablyRest.channels.get(`notifications:client:${this.clId}`)
            .publish('new_ticket', newTicketPayload);
        } catch (error) {
            console.log("errorXXXXXXXXXXXXXXXXXXXXX", error)
        }
    }
  
    // ----- Public entry point ---------------------------------
    async route(ticket, channelType) {
      // 1. Pull all teams for this workspace
      const teams = await this.#fetchTeams();
      if (teams.length === 0) return this.#assignFirstUser(ticket);
  
      // 2. Pull settings
      const settings = await this.#fetchSettings();
      const restricted =  settings?.ticket_restriction === true;
  
      if (!restricted) {
        return this.#insertTeams(ticket.id, teams.map(t => t.id));
      }
  
      // 3. Restricted flow
      const channelTeams = await this.#teamsLinkedToChannel(ticket, channelType);
      if (channelTeams.length === 1) {
        const teamId   = channelTeams[0].teamId;
        await this.#insertTeams(ticket.id, [teamId]);
        return this.#assignTeamMate(ticket, teamId);
      }
  
      if (channelTeams.length > 1) {
        // Should never happen if uniqueness is enforced – log for ops
        console.warn('Multiple teams linked to same channel', channelTeams);
        return;
      }
  
      // channelTeams.length === 0
      const anyTeamChannels = await this.#anyTeamChannelInWorkspace();
      if (!anyTeamChannels) {
        // no channel mapped anywhere ⇒ add all teams
        //if only one team, assign it to the ticket
        if (teams.length === 1) {
          await this.#insertTeams(ticket.id, [teams[0].id]);
          return this.#assignTeamMate(ticket, teams[0].id);
        }else{
          return this.#insertTeams(ticket.id, teams.map(t => t.id));
        }
      }
      // Else → leave unassigned
    }
  
    // ---------- helpers -----------------
    async #fetchTeams() {
      const { data } = await this.sb
        .from('teams')
        .select('id')
        .eq('workspaceId', this.wsId)
        .eq('clientId', this.clId);
      return data || [];
    }
  
    async #fetchSettings() {
      const {data, error} = await this.sb
        .from('ticket_settings')
        .select('*')
        .eq('workspace_id', this.wsId)
        .eq('client_id', this.clId)
        .single();
      if (error) {
        return {};
      }
      return data || {};
    }
  
    async #teamsLinkedToChannel(ticket, channelType) {
      if (channelType === 'chat') {
        // widgets → teamChannels
        const { data, error } = await this.sb
          .from('teamChannels')
          .select('teamId')
          .eq('widgetId', ticket.chatWidgetId);            // assume widgetId on ticket
        if (error) {
          return [];
        }
        return data || [];
      }
      // email
      const { data, error } = await this.sb
        .from('teamChannels')
        .select('teamId')
        .eq('channelId', ticket.emailChannelId);
      if (error) {
        return [];
      }
      return data || [];
    }
  
    async #anyTeamChannelInWorkspace() {
      const { count } = await this.sb
        .from('teamChannels')
        .select('id', { head: true, count: 'exact' })
        .eq('workspaceId', this.wsId)
        .eq('clientId', this.clId);
      return count > 0;
    }
  
    async #insertTeams(ticketId, teamIds) {
      const rows = teamIds.map(id => ({
        ticket_id:   ticketId,
        team_id:     id,
        client_id:   this.clId,
        workspace_id:this.wsId,
        created_at:  new Date(),
        updated_at:  new Date()
      }));
      if (rows.length === 0) return;
      await this.updateTicketStatus(ticketId, 'Open', teamIds);
      await this.sb.from('ticket_teams')
        .insert(rows, { ignoreDuplicates: true });
    }
  
    async #assignTeamMate(ticket, teamId) {
        // 1. Get team with strategy
        try{

            const { data: team, error: teamError } = await this.sb
              .from('teams')
              .select('id, routingStrategy')
              .eq('id', teamId)
              .single();
          
            if (teamError || !team) {
              console.error('Failed to fetch team info:', teamError);
              return;
            }
          
            // 2. Get all team members (active)
            const { data: members, error: membersError } = await this.sb
              .from('teamMembers')
              .select('user_id')
              .eq('team_id', teamId);
          
            if (membersError || !members || members.length === 0) {
              console.error('No team members found or failed to fetch:', membersError);
              return;
            }
          
            let assigneeId = null;
            if (team.routingStrategy === 'round-robin') {
              // 👉 Step A: Get last ticket assigned by this team
              const { data: lastTicket } = await this.sb
                .from('tickets')
                .select('assignedTo')
                .is('deletedAt', null)
                .not('assignedTo', 'is', null)
                .order('createdAt', { ascending: false })
                .limit(1)
                .single();
          
              const userIds = members.map(m => m.user_id);
              if(!lastTicket){
                assigneeId = userIds[0];
              }else{
                  if (userIds.length === 1) {
                    assigneeId = userIds[0];
                  } else {
                        const lastIndex = lastTicket ? userIds.indexOf(lastTicket.assignedTo) : -1;
                    const nextIndex = (lastIndex + 1) % userIds.length;
                    assigneeId = userIds[nextIndex];
                  }
              }
            }
          
            else if (team.routingStrategy === 'load-balanced') {
              // 👉 Step B: Count open tickets per user in this team
              const { data: counts, error: loadError } = await this.sb
                .from('tickets')
                .select('assignedTo, count(*)')
                .eq('teamId', teamId)
                .is('deletedAt', null)
                .is('closedAt', null)
                .not('assignedTo', 'is', null)
                .group('assignedTo');
          
              if (loadError) {
                console.error('Load-balanced count failed:', loadError);
                return;
              }
              if(!counts){
                assigneeId = members[0].user_id;
              }else{
                const loadMap = new Map();
                members.forEach(m => loadMap.set(m.user_id, 0)); // default load 0
                counts?.forEach(row => {
                  loadMap.set(row.assignedTo    , row.count);
                });
                const sorted = [...loadMap.entries()].sort((a, b) => a[1] - b[1]);
                assigneeId = sorted[0][0]; // user with least load
              }
          
              // Pick user with least load
              // const sorted = [...loadMap.entries()].sort((a, b) => a[1] - b[1]);
              // assigneeId = sorted[0][0]; // user with least load
            }
          
            if (!assigneeId) {
              console.warn('Could not determine assignee');
              return;
            }
          
            // 3. Assign the ticket
            await this.sb.from('tickets')
              .update({ assignedTo: assigneeId })
              .eq('id', ticket.id);

            await this.updateTicketTeamMate(ticket.id, assigneeId, [teamId]);
          
            console.log(`Ticket ${ticket.id} assigned to user ${assigneeId} using strategy ${team.routingStrategy}`);
        } catch (error) {
            console.log("errorXXXXXXXXXXXXXXXXXXXXX", error)
        }
    }

    async updateTicketTeamMate(ticketId, userId, teamIds) {
        try{
        const {data:teamMate, error:teamMateError} = await this.sb
            .from('users')
            .select('id,name,email')
            .eq('id', userId)
            .single();
        if (teamMateError) throw teamMateError;

        const {data:ticket, error:ticketError} = await this.sb
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .single();
        if (ticketError) throw ticketError;

        const {data:customer, error:customerError} = await this.sb
            .from('customers')
            .select('id,firstname,lastname,email')
            .eq('id', ticket.customerId)
            .single();
        if (customerError) throw customerError;

        const {data:team, error:teamError} = await this.sb
            .from('teams')
            .select('id,name')
            .in('id', teamIds)
            .single();
        if (teamError) throw teamError;

        const newTicketPayload = {
            id: ticketId,
            ticket_sno: ticketId,
            sno: ticket.sno ?? ticketId,
            subject: ticket.title,
            description: null,
            customer: {
                id: customer.id,
                name: `${customer.firstname} ${customer.lastname}`,
                email: customer.email,
                phone: null,
            },
            customerId: customer.id,
            status:"Open",
            priority:"Low",
            assignee:null,
            assignedTo:null,
            assignedToUser:null,
            teamIds:teamIds,
            team:team,
            teams: team,
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isUnread: false,
            hasNotification: false,
            notificationType: null,
            recipients: [],
            customFields: [],
            topicIds: [],
            mentionIds: [],
            messages: [],
            assignedTo: {
                id: teamMate.id,
                name: teamMate.name,
                email: teamMate.email,
                bot_enabled: false
              },
              assignedToUser: {
                id: teamMate.id,
                name: teamMate.name,
                email: teamMate.email,
                bot_enabled: false
              },
          }
        
        this.ablyRest.channels.get(`notifications:client:${this.clId}`)
            .publish('new_ticket', newTicketPayload);
        } catch (error) {
            console.log("errorXXXXXXXXXXXXXXXXXXXXX", error)
        }
    }

  
    async #assignFirstUser(ticket) {
      const { data: user } = await this.sb
        .from('users')
        .select('*, userRoles:rolesId(')
        .eq('workspaceId', this.wsId)
        .eq('clientId', this.clId)
        .eq('isActive', true)
        .limit(1)
        .single();
      if (!user) return;
  
      await this.sb.from('tickets')
        .update({ assignedTo: user.id })
        .eq('id', ticket.id);
    }
  }
  