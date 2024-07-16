const BaseHandler = require("./BaseHandler");
const WorkspaceService = require("../services/WorkspaceService");
const AuthService = require("../services/AuthService");

const mongoose = require("mongoose");
const WorkspaceSchema = require("../db/schemas/WorkspaceSchema");
class WorkspaceHandler extends BaseHandler {
  constructor() {
    super();
    this.ServiceInst = new WorkspaceService(null, { AuthService });
  }

  async createWorkspace(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;

    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.createWorkspace(req.body));
  }
  async listUsers(req, reply) {
    let workspaceId = req.params.workspace_id;
    let clientId = req.authUser.clientId;

    let filters = {
      name: req.query.name,
      email: req.query.email,
      roleId: req.query.roleId,
      teamId: req.query.teamId,
      createdFrom: req.query.created_from,
      createdTo: req.query.created_to,
      skip: req.query.skip,
      limit: req.query.limit,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      workspaceId,
      clientId,
    };

    let inst = new UserService();
    return this.responder(req, reply, inst.paginate(filters));
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
      clientId,
    };
    let inst = this.ServiceInst;
    let workspaces = await this.responder(req, reply, inst.paginate(filters));
    // console.log("WorkSpaces:-", workspaces);
    // console.log("WorkSpaces:-", JSON.stringify(workspaces));
    // console.log("------------------------------------");
    // Fetch creator's email for each workspace
    let populatedWorkspaces = await inst.populateWorkspaceCreators(workspaces);

    return populatedWorkspaces;
    // console.log(workspaces);
    // return workspaces;
  }

  async showWorkspaceDetail(req, reply) {
    let clientId = req.authUser.clientId;

    let inst = this.ServiceInst;
    return this.responder(
      req,
      reply,
      inst.getDetails(req.params.workspace_id, clientId)
    );
  }

  // async viewUser(req, reply) {
  //   // let clientId = req.authUser.clientId;

  //   let inst = this.ServiceInst;
  //   return this.responder(
  //     req,
  //     reply,
  //     inst.findUserById(req.params.id) // ,clientId removed
  //   );
  // }

  async viewUsers(req, reply) {
    console.log("================================,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,")
    console.log(req.params.workspace_id)
    let inst = this.ServiceInst;
    return this.responder(
      req,
      reply,
      inst.findByWorkspaceId(req.params.workspace_id)
    );
  }

  async updateWorkspace(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.workspace_id;
    let toUpdate = req.body;
    let inst = this.ServiceInst;
    return this.responder(
      req,
      reply,
      inst.updateWorkspace({ id, clientId }, toUpdate)
    );
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
