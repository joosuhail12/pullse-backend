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

  async createWorkflow(req, res) {
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;
    req.body.createdBy = req.authUser.id;
    let inst = new WorkflowService();
    return this.responder(req, res, inst.createWorkflow(req.body));
  }

  async getAllWorkflows(req, res) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = new WorkflowService();
    return this.responder(req, res, inst.getAllWorkflows({ workspaceId, clientId }));
  }

  async getWorkflowById(req, res) {
    let id = req.params.id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = new WorkflowService();
    return this.responder(req, res, inst.getWorkflowById({ id, workspaceId, clientId }));
  }


  async deleteWorkflow(req, res) {
    let id = req.params.id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = new WorkflowService();
    return this.responder(req, res, inst.deleteWorkflow({ id, workspaceId, clientId }));
  }

  async updateWorkflowTags(req, res) {
    let id = req.params.id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = new WorkflowService();
    return this.responder(req, res, inst.updateWorkflowTags({ id, workspaceId, clientId, tags: req.body.tags }));
  }

  async updateWorkflow(req, res) {
    let id = req.params.id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = new WorkflowService();
    return this.responder(req, res, inst.updateWorkflow({ id, workspaceId, clientId, workflowConfig: req.body.workflowConfig, nodes: req.body.nodes, edges: req.body.edges }));
  }

  async activateWorkflow(req, res) {
    let id = req.params.id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = new WorkflowService();
    return this.responder(req, res, inst.activateWorkflow({ id, workspaceId, clientId }));
  }
}

module.exports = WorkflowHandler;
