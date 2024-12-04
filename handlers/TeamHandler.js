const BaseHandler = require('./BaseHandler');
const TeamService = require('../services/TeamService');


class TeamHandler extends BaseHandler {

  constructor() {
    super();
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
      createdFrom: req.query.created_from,
      createdTo: req.query.created_to,
      workspaceId: req.query.workspace_id,
      clientId: req.authUser.clientId
    };
    let inst = new TeamService();
    return this.responder(req, reply, inst.paginate(filters));
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

}

module.exports = TeamHandler;
