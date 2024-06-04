const BaseHandler = require('./BaseHandler');
const WorkflowService = require('../services/WorkflowService');
const WorkflowRuleService = require('../services/WorkflowRuleService');
const WorkflowActionService = require('../services/WorkflowActionService');
const TicketService = require('../services/TicketService');
const EmailService = require('../services/EmailService');

const { getEntities, getWorkflowEvents } = require('../Utils/WorkflowUtility');


class WorkflowHandler extends BaseHandler {

  constructor() {
    super();
    let dependencies = {
      WorkflowRuleService,
      WorkflowActionService,
      TicketService,
      EmailService
    };
    this.workflowServiceInst = new WorkflowService(null, dependencies);
  }

  async createWorkflow(req, reply) {
    let workflowData = req.body;
    workflowData.createdBy = req.authUser.id;
    workflowData.clientId = req.authUser.clientId;
    workflowData.workspaceId = req.query.workspace_id;

    let inst = this.workflowServiceInst;
    return this.responder(req, reply, inst.createWorkflow(workflowData));
  }

  async listWorkflow(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let filters = {
      name: req.query.name,
      status: req.query.status,
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
    let inst = this.workflowServiceInst;
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showWorkflowDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let workflowId = req.params.workflow_id;
    let inst = this.workflowServiceInst;
    return this.responder(req, reply, inst.getWorkflowDetails(workflowId, workspaceId, clientId, true));
  }

  async updateWorkflow(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.workflow_id;
    let toUpdate = req.body;
    toUpdate.lastUpdatedBy = req.authUser.id;
    let inst = this.workflowServiceInst;
    return this.responder(req, reply, inst.updateWorkflow({ id, workspaceId, clientId }, toUpdate));
  }

  async deleteWorkflow(req, reply) {
    let id = req.params.workflow_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;


    let inst = this.workflowServiceInst;
    return this.responder(req, reply, inst.deleteWorkflow({ id, workspaceId, clientId }));
  }

  async getWorkflowEntities(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    return this.responder(req, reply, getEntities(workspaceId, clientId));
  }

  async getWorkflowEvents(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let data = { events: [] };
    try {
      data = await getWorkflowEvents(workspaceId, clientId);
    } catch (error) {
      console.log(error);
      return this.responder(req, reply, Promise.reject(error));
    }
    return this.responder(req, reply, Promise.resolve({docs: data.events }));
  }

}

module.exports = WorkflowHandler;
