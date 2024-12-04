const BaseHandler = require('./BaseHandler');
const WorkspaceService = require('../services/WorkspaceService');
const AuthService = require('../services/AuthService');
const UserService = require('../services/UserService');
const WorkspacePermissionService = require('../services/WorkspacePermissionService');
const ClientService = require('../services/ClientService');


class WorkspaceHandler extends BaseHandler {

  constructor() {
    super();
    this.ServiceInst = new WorkspaceService(null, { AuthService, UserService, WorkspacePermissionService, ClientService });
  }

  async createWorkspace(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;

    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.createWorkspace(req.body));
  }

  async listWorkspace(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let filters = {
      name: req.query.name,
      createdFrom: req.query.created_from,
      createdTo: req.query.created_to,
      skip: req.query.skip,
      limit: req.query.limit,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      workspaceId,
      clientId
    };
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.paginate(filters));
  }
  async listMyWorkspace(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let userId = req.user.id

    let filters = {
      name: req.query.name,
      createdFrom: req.query.created_from,
      createdTo: req.query.created_to,
      skip: req.query.skip,
      limit: req.query.limit,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      workspaceId,
      clientId
    };
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.getMyWorkspace({clientId,userId}));
  }


  async showWorkspaceDetail(req, reply) {
    let clientId = req.authUser.clientId;
    let userId = req.authUser.id

    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.getWorkspaceDetails(req.params.workspace_id, clientId,userId));
  }

  async updateWorkspace(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.workspace_id;
    let toUpdate = req.body;
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.updateWorkspace({ id, clientId }, toUpdate));
  }

  async deleteWorkspace(req, reply) {
    let id = req.params.workspace_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;


    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.deleteWorkspace({ id, clientId }));
  }

}

module.exports = WorkspaceHandler;
