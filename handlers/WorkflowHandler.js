const BaseHandler = require('./BaseHandler');
const WorkflowService = require('../services/WorkflowService');
class WorkflowHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createWorkflowFolder(req, res) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    let inst = new WorkflowService();
    return this.responder(req, res, inst.createWorkflowFolder(req.body));
  }

  async getWorkflowFolders(req, res) {
    let clientId = req.authUser.clientId;
    let workspaceId = req.query.workspace_id;
    let inst = new WorkflowService();
    return this.responder(req, res, inst.getWorkflowFolders({ clientId, workspaceId }));
  }

  async deleteWorkflowFolder(req, res) {
    let id = req.params.id;
    let inst = new WorkflowService();
    return this.responder(req, res, inst.deleteWorkflowFolder(id));
  }

  async updateWorkflowFolder(req, res) {
    let id = req.params.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;
    req.body.updatedBy = req.authUser.id;
    let inst = new WorkflowService();
    return this.responder(req, res, inst.updateWorkflowFolder(id, req.body));
  }

}

module.exports = WorkflowHandler;
