const BaseHandler = require('./BaseHandler');
const TeamService = require('../services/TeamService');
const TicketService = require('../services/TicketService');

class TeamHandler extends BaseHandler {

  constructor() {
    super();
  }

  sanitizeQuery(query) {
    Object.keys(query).forEach(key => {
      if (query[key] === 'null' || query[key] === '' || query[key] === undefined) {
        query[key] = null;
      }
    });
  }

  async createTeam(req, reply) {
    let inst = new TeamService();
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;
    return this.responder(req, reply, inst.createTeam(req.body));
  }

  async listTeam(req, reply) {
    let filters = {
      name: req.query.name,
      workspaceId: req.query.workspace_id,
      clientId: req.authUser.clientId
    };

    let inst = new TeamService();
    return this.responder(req, reply, inst.listTeams(filters));
  }

  async showTeamDetail(req, reply) {
    let inst = new TeamService();
    let teamId = req.params.team_id;
    let clientId = req.authUser.clientId;
    let workspaceId = req.query.workspace_id;

    return this.responder(req, reply, inst.getDetails(teamId, workspaceId, clientId));
  }

  async updateTeam(req, reply) {
    let teamId = req.params.team_id;
    let clientId = req.authUser.clientId;
    let workspaceId = req.query.workspace_id;

    let toUpdate = req.body;
    let inst = new TeamService();
    return this.responder(req, reply, inst.updateTeam({ id: teamId, workspaceId, clientId }, toUpdate));
  }

  async deleteTeam(req, reply) {
    let teamId = req.params.team_id;
    let clientId = req.authUser.clientId;
    let workspaceId = req.query.workspace_id;

    let inst = new TeamService();
    return this.responder(req, reply, inst.deleteTeam({ id: teamId, workspaceId, clientId }));
  }

  async getUserTeamTickets(req, reply) {
    const userId = req.authUser.id;
    const clientId = req.authUser.clientId;
    const workspaceId = req.query.workspace_id;

    this.sanitizeQuery(req.query);

    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      workspaceId,
      clientId,
      skip: parseInt(req.query.skip || 0),
      limit: parseInt(req.query.limit || 10)
    };

    const ticketService = new TicketService();
    return this.responder(req, reply, ticketService.listTicketsForUserTeams(userId, filters));
  }

  async getTeamTickets(req, reply) {
    const teamId = req.params.team_id;
    const clientId = req.authUser.clientId;
    const workspaceId = req.query.workspace_id;

    this.sanitizeQuery(req.query);

    const filters = {
      teamId,
      clientId,
      workspaceId,
      status: req.query.status,
      priority: req.query.priority,
      skip: parseInt(req.query.skip || 0),
      limit: parseInt(req.query.limit || 10)
    };

    const ticketService = new TicketService();
    return this.responder(req, reply, ticketService.listTicketsByTeam(filters));
  }

  async getUserTeams(req, reply) {
    const userId = req.params.user_id;
    const clientId = req.authUser.clientId;
    const workspaceId = req.query.workspace_id;

    if (!userId) {
      return this.responder(req, reply, Promise.reject(new Error('User ID is required')));
    }

    let inst = new TeamService();
    return this.responder(req, reply, inst.getUserTeams(userId, workspaceId, clientId));
  }

  async getUserTeammates(req, reply) {
    const userId = req.params.user_id;
    const clientId = req.authUser.clientId;
    const workspaceId = req.query.workspace_id;

    if (!userId) {
      return this.responder(req, reply, Promise.reject(new Error('User ID is required')));
    }

    let inst = new TeamService();
    return this.responder(req, reply, inst.getUserTeammates(userId, workspaceId, clientId));
  }

  async addTeammateToTeam(req, reply) {
    const teamId = req.params.team_id;
    const { userId } = req.body;
    const clientId = req.authUser.clientId;
    const workspaceId = req.query.workspace_id;

    if (!teamId) {
      return this.responder(req, reply, Promise.reject(new Error('Team ID is required')));
    }

    if (!userId) {
      return this.responder(req, reply, Promise.reject(new Error('User ID is required')));
    }

    let inst = new TeamService();
    return this.responder(req, reply, inst.addTeammateToTeam(teamId, userId, workspaceId, clientId));
  }

  async getTeamMembersDetailed(req, reply) {
    const teamId = req.params.team_id;
    const clientId = req.authUser.clientId;
    const workspaceId = req.query.workspace_id;

    if (!teamId) {
      return this.responder(req, reply, Promise.reject(new Error('Team ID is required')));
    }

    let inst = new TeamService();
    return this.responder(req, reply, inst.getTeamMembersDetailed(teamId, workspaceId, clientId));
  }

  async getTicketTeammates(req, reply) {
    const ticketId = req.params.ticket_id;
    const clientId = req.authUser.clientId;
    const workspaceId = req.query.workspace_id;
    const currentUserId = req.authUser.id;

    if (!ticketId) {
      return this.responder(req, reply, Promise.reject(new Error('Ticket ID is required')));
    }

    let inst = new TeamService();
    return this.responder(req, reply, inst.getTicketTeammates(ticketId, workspaceId, clientId, currentUserId));
  }
}

module.exports = TeamHandler;
