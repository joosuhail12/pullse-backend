const BaseHandler = require('./BaseHandler');
const WorkspacePermissionService = require('../services/WorkspacePermissionService');
const AuthService = require('../services/AuthService');
const UserService = require('../services/UserService');


class WorkspacePermissionHandler extends BaseHandler {

  constructor() {
    super();
    this.ServiceInst = new WorkspacePermissionService(null, { AuthService, UserService });
  }

  async createWorkspacePermission(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;

    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.createWorkspacePermission(req.body));
  }

  async updateWorksapcePermissionAccess(req,reply){
    let workspaceId = req.params.workspace_id; 
    let clientId = req.authUser.clientId;
    let access = req.body.access;
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.updateWorkspacePermission({ id:workspaceId, clientId }, {access}));
  }

  async listWorkspacePermission(req, reply) {
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

  async showWorkspacePermissionDetail(req, reply) {
    let clientId = req.authUser.clientId;

    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.getWorksapcePermissionDetails(req.params.workspace_id, clientId));
  }

  async updateWorkspacePermission(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.workspace_id;
    let toUpdate = req.body;
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.updateWorkspacePermission({ id, clientId }, toUpdate));
  }

  async deleteWorkspacePermisison(req, reply) {
    let id = req.params.id;
    let clientId = req.authUser.clientId;


    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.deleteWorkspacePermission({ id, clientId }));
  }

}

module.exports = WorkspacePermissionHandler;
