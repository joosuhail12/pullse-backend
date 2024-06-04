const BaseHandler = require('./BaseHandler');
const EventWorkflowService = require('../services/EventWorkflowService');
const WorkflowService = require('../services/WorkflowService');

class EventWorkflowHandler extends BaseHandler {

  constructor() {
    super();
    this.eventWorkflowServiceInst = new EventWorkflowService(null, {WorkflowService});
  }

  async createEventWorkflow(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;
    let inst = this.eventWorkflowServiceInst;
    return this.responder(req, reply, inst.createEventWorkflow(req.body));
  }

  async listEventWorkflow(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let filters = {
      name: req.query.name,
      eventId: req.query.event_id,
      workflowId: req.query.workflow_id,
      archived: req.query.archived,
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
    let inst = this.eventWorkflowServiceInst;
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showEventWorkflowDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = this.eventWorkflowServiceInst;
    return this.responder(req, reply, inst.getDetails(req.params.event_workflow_id, workspaceId, clientId));
  }

  async updateEventWorkflow(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.event_workflow_id;
    let toUpdate = req.body;
    let inst = this.eventWorkflowServiceInst;
    return this.responder(req, reply, inst.updateEventWorkflow({ id, workspaceId, clientId }, toUpdate));
  }

  async deleteEventWorkflow(req, reply) {
    let id = req.params.event_workflow_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;


    let inst = this.eventWorkflowServiceInst;
    return this.responder(req, reply, inst.deleteEventWorkflow({ id, workspaceId, clientId }));
  }

}

module.exports = EventWorkflowHandler;
