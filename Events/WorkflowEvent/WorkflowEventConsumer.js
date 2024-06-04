const _ = require("lodash");
const { events: EVENTS, queue } = require('./config');
const { EventConsumer } = require('../Event');
const EventConstants = require("../../Socket/EventConstants");
const TicketService = require("../../services/TicketService");
// const CustomerService = require("../../services/CustomerService");
// const CompanyService = require("../../services/CompanyService");
const EventWorkflowService = require("../../services/EventWorkflowService");
const WorkflowService = require("../../services/WorkflowService");
const Events = require("../../Utils/WorkflowUtility/events");
const RulesEngine = require("../../Utils/WorkflowUtility/RulesEngine");

class WorkflowEventConsumer extends EventConsumer {
  constructor() {
    super();
    this.queue = queue;
    this.RulesEngineInst = new RulesEngine();
    this.EventHandlers = {
      [EVENTS.created]: this.created.bind(this),
      [EVENTS.updated]: this.updated.bind(this),

      [EVENTS.newTicket]: this.newTicket.bind(this),
      [EVENTS.ticketUpdated]: this.ticketUpdated.bind(this),
      [EVENTS.ticketClosed]: this.ticketClosed.bind(this),

      [EVENTS.newMessage]: this.newMessage.bind(this),

    };
    // this.EntityInstances = {
    //   'ticket': TicketService,
    //   'customer': CustomerService,
    //   'company': CompanyService
    // };
  }

  async loadWorkFlows(filters = {}) {
    let { eventId, workspaceId, clientId } = filters;
    let eventWorkflowInst = new EventWorkflowService();
    let eventWorkFlows = await eventWorkflowInst.paginate({ eventId, workspaceId, clientId }, false);
    if (!eventWorkFlows.length) {
      console.log("No eventWorkFlows for event %s", eventId);
      return Promise.resolve();
    }
    let workflowIds = eventWorkFlows.map(eventWorkFlow => eventWorkFlow.workflowId);
    if (!workflowIds.length) {
      console.log("No workflowIds for event %s", eventId);
      return Promise.resolve();
    }

    let workflowInst = new WorkflowService();
    let workflows = await workflowInst.paginate({ ids : workflowIds, workspaceId, clientId }, false);
    if (!workflows.length) {
      console.log("No workflows for event %s", eventId);
      return Promise.resolve();
    }
    workflows = await workflowInst.utilityInst.populate('rules', workflows);
    workflows = await workflowInst.utilityInst.populate('actions', workflows);


    let ruleInst = new RulesEngine();
    for await (let workflow of workflows) {
      // await this.RulesEngineInst.addWorkflow(workflow);
      if (_.isEmpty(workflow.rules)) {
        // direct execute event to run this workflow here
        continue;
      }
      try {
        await ruleInst.addWorkflow(workflow);
      } catch (error) {
        console.error(error);
        console.log("workflow:", workflow);
      }
    }
    // return Promise.resolve(ruleInst);
    console.log({ruleInst}, 'return');
    return ruleInst;
  }

  async created(data) {
    console.log("Execute workflow created event is pending...");
  }

  async updated(data) {
    console.log("Execute workflow updated event is pending...");
  }

  async ticketUpdated(data) {
    console.log("Execute workflow ticketUpdated event is pending...");
  }

  async ticketClosed(data) {
    console.log("Execute workflow ticketClosed event is pending...");
  }

  async newMessage(data) {
    console.log("Execute workflow newMessage event is pending...");
  }

  async newTicket(data) {
    try {
      let eventId = "ticket_created";
      let { ticket } = data;
      let { workspaceId, clientId, } = ticket;
      let ticketInst = new TicketService();
      ticket = await ticketInst.getDetails(ticket.sno, workspaceId, clientId, true);
      let customer = ticket.customer;
      let company = ticket.company;
      let filters = { workspaceId, clientId, eventId };
      let ruleInst = await this.loadWorkFlows(filters);
      if (!ruleInst) {
        console.info("No workflow actions defined for event %s.", eventId)
        return Promise.resolve();
      }
      // await this.RulesEngineInst.run(data);
      await ruleInst.run({ ticket, customer, company });
    } catch (error) {
      console.error(error);
    }
    return Promise.resolve(data);
  }


  async ticketUpdated(data) {
    console.info("Run Ticket Updated workflow");
  }

  async checkEventWorkflow({ eventId, entity }) {
    // Get Attached Event Workflows
    let event = Events.find(e => e.id == eventId);
    if (!event || !this.EntityInstances[event.entity]) {
      return Promise.reject("Unknown event or instance not found.");
    }
    let { workspaceId, clientId } = entity;
    let filters = { workspaceId, clientId, eventId: event.id };


    let eventWorkflowInst = new EventWorkflowService();
    let eventWorkFlows = await eventWorkflowInst.paginate({ eventId, workspaceId, clientId } = {}, false);
    if (!eventWorkFlows.length) {
      return Promise.resolve();
    }
    let workflowIds = eventWorkFlows.map(eventWorkFlow => eventWorkFlow.workflowId);

    let workflowInst = new WorkflowService();
    let workFlows = await workflowInst.getWorkflowDetails({ id: { $in: workflowIds },  } = {}, false);
    if (!workFlows.length) {
      return Promise.resolve();
    }
    workflows = await workflowInst.utilityInst.populate('rules', workFlows);
    workflows = await workflowInst.utilityInst.populate('actions', workFlows);

    let customer, ticket, company;
    if (event.entity == 'ticket') {
      let ticketInst = new TicketService();
      ticket = await ticketInst.getDetails(entity.sno, workspaceId, clientId, true);
      customer = ticket.customer;
      company = ticket.company;
    }

    workflows.forEach(async workflow => {
      await this.checkWorkflowRulesForEntity(workflow, { ticket, customer, company });
    });

    // let workFlows = await workflowInst.getWorkflowDetails({ id: { $in: workflowIds },  } = {}, false);
    // if (!workFlows.length) {
    //   return Promise.resolve();
    // }
    event
  }

  async checkWorkflowRulesForEntity(workflow, { ticket, customer, company }) {
    let result = {};
    for (let rule of workflow.rules) {
      result[rule.matchType] = false;
       // all/any
      //  properties
      // property.resource
      // property.field
      // property.operator
      // property.value
      //
    }
    entity

    await entityInstance.paginate({ id: entity.id, workspaceId, clientId });
  }



  async executeWorkflow({ workflowId }, ticket) {
    let workflowInst = new WorkflowService();
    let workFlows = await workflowInst.getWorkflowDetails({ id: { $in: workflowIds },  } = {}, false);
    if (!workFlows.length) {
      return Promise.resolve();
    }
    workflows = await workflowInst.utilityInst.populate('rules', workFlows);
    workflows = await workflowInst.utilityInst.populate('actions', workFlows);

  }

}

module.exports = WorkflowEventConsumer;
