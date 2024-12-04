const _ = require("lodash");
const Promise = require("bluebird");
const BaseService = require("./BaseService");
const WorkflowUtility = require('../db/utilities/WorkflowUtility');
const errors = require("../errors");
const DecisionEngine = require('../DecisionEngine');
const { v4: uuid } = require('uuid');
const moment = require('moment');

class WorkflowService extends BaseService {

    constructor(fields=null, dependencies={}) {
        super();
        this.utilityInst = new WorkflowUtility();
        this.WorkflowRuleService = dependencies.WorkflowRuleService;
        this.WorkflowActionService = dependencies.WorkflowActionService;
        this.TicketService = dependencies.TicketService;
        this.EmailService = dependencies.EmailService;
        this.entityName = 'Workflow';
        this.listingFields = [ "id", "name", "description", "status", "affectedTicketsCount", "-_id" ];
        this.updatableFields = [ "name", "summary", "description", "status", "ruleIds", "actionIds", "lastUpdatedBy" ];
        this.DecisionEngine = dependencies.DecisionEngine || null;
    }

    async createWorkflow(workflowData) {
        try {
            /*
            * Workflow Validation
            */
            let { name, createdBy, workspaceId, clientId } = workflowData;
            // { name, description, ruleIds, actionIds, workspaceId, clientId, createdBy }
            if (_.isEmpty(name)) {
                name = `Workflow ${uuid()}`;
            }
            let workflow = await this.findOne({ name: { $regex : `^${name}$`, $options: "i" }, workspaceId, clientId });
            if (!_.isEmpty(workflow)) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${name}" already exist.`));
            }

            /*
            * Rules Validation
            */
            let ruleInst = new this.WorkflowRuleService(null, {TicketService: this.TicketService, WorkflowActionService: this.WorkflowActionService , EmailService: this.EmailService});
            let { ruleIds, error: ruleErrors } = await ruleInst.createOrUpdateRules(workflowData.rules, workflowData.createdBy, workflowData.workspaceId, workflowData.clientId);
            if (!_.isEmpty(ruleErrors)) {
                return Promise.reject(new errors.BadRequest("Error in rules.", {entity: "rules", error: ruleErrors }));
            }
            if (_.isEmpty(ruleIds)) {
                return Promise.reject(new errors.BadRequest("No rules found.", { entity: "rules", error: ruleErrors } ));
            }
            delete workflowData.rules;
            workflowData.ruleIds = ruleIds;

            /*
            * Actions Validation
            *
            */
            let actionInst = new this.WorkflowActionService(null, {TicketService: this.TicketService, WorkflowRuleService: this.WorkflowRuleService, EmailService: this.EmailService});
            let { actionIds, error: actionErrors } = await actionInst.createOrUpdateActions(workflowData.actions, workflowData.createdBy, workflowData.workspaceId, workflowData.clientId);
            if (!_.isEmpty(actionErrors)) {
                return Promise.reject(new errors.BadRequest("Error in actions.", {entity: "actions", error: actionErrors }));
            }
            if (_.isEmpty(actionIds)) {
                return Promise.reject(new errors.BadRequest("No actions found.", { entity: "actions", error: actionErrors } ));
            }
            delete workflowData.actions;
            workflowData.actionIds = actionIds;

            let res = await this.create({ ...workflowData, name, createdBy, workspaceId, clientId })
            .catch(err => {
                if (err instanceof errors.Conflict) {
                    return new errors.AlreadyExist("Workflow already exist.")
                }
                return Promise.reject(err);
            });
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getWorkflowDetails(id, workspaceId, clientId, populate=false) {
        try {
            let workflow = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(workflow)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            if (!populate) {
                return workflow;
            }
            let workflows = await this.utilityInst.populate('rules', [workflow]);
            workflows = await this.utilityInst.populate('actions', [workflow]);
            return workflows[0];
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateWorkflow({ id, workspaceId, clientId }, toUpdate) {
        try {
            let workflow = await this.getWorkflowDetails(id, workspaceId, clientId);

            if (!_.isEmpty(toUpdate.rules)) {
                let ruleInst = new this.WorkflowRuleService();
                let { ruleIds, error } = await ruleInst.createOrUpdateRules(toUpdate.rules, workflow.createdBy, workflow.workspaceId, workflow.clientId);
                if (!_.isEmpty(error)) {
                    return Promise.reject(new errors.BadRequest("Error in rules.", {entity: "rules", error }));
                }
                if (_.isEmpty(ruleIds)) {
                    return Promise.reject(new errors.BadRequest("No rules found.", { entity: "rules", error } ));
                }
                delete toUpdate.rules;
                toUpdate.ruleIds = ruleIds;
            }

            if (!_.isEmpty(toUpdate.actions)) {
                let actionInst = new this.WorkflowActionService();
                let { actionIds, error: actionErrors } = await actionInst.createOrUpdateActions(toUpdate.actions, workflow.createdBy, workflow.workspaceId, workflow.clientId);
                if (!_.isEmpty(actionErrors)) {
                    return Promise.reject(new errors.BadRequest("Error in actions.", {entity: "actions", error: actionErrors }));
                }
                if (_.isEmpty(actionIds)) {
                    return Promise.reject(new errors.BadRequest("No actions found.", { entity: "actions", error: actionErrors } ));
                }
                delete toUpdate.actions;
                toUpdate.actionIds = actionIds;
            }

            await this.update({ id, workspaceId, clientId }, toUpdate);

            return Promise.resolve();
        } catch(err) {
            return this.handleError(err);
        }
    }

    async deleteWorkflow({ id, workspaceId, clientId }) {
        try {
            let ticket = await this.getWorkflowDetails(id, workspaceId, clientId);
            let res = await this.softDelete(ticket.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ ids, name, status, ruleId, actionId, createdFrom, createdTo, workspaceId, clientId }) {
      let filters = {};
      filters.workspaceId = workspaceId;
      filters.clientId = clientId;

      if (ids) {
        filters.id =  { "$in": ids };
      }
      if (name) {
        filters.name = { $regex : `^${name}`, $options: "i" };
      }

      if (status) {
        filters.status = status;
      }

      if (ruleId) {
        filters.ruleId = ruleId;
      }

      if (actionId) {
        filters.actionId = actionId;
      }


      if (createdFrom) {
        if (!moment(createdFrom, moment.ISO_8601, true).isValid()) {
            return Promise.reject(new errors.BadRequest("Invalid created from date format."));
        }
        if (!filters.createdAt) {
            filters.createdAt = {}
        }
        filters.createdAt['$gte'] = new Date(createdFrom);
      }
      if (createdTo) {
          if (!moment(createdTo, moment.ISO_8601, true).isValid()) {
              return Promise.reject(new errors.BadRequest("Invalid created to date format."));
          }
          if (!filters.createdAt) {
              filters.createdAt = {}
          }
          filters.createdAt['$lt'] = new Date(createdTo);
      }

      return filters;
    }

    async getWorkflowEntities() {
        let entities = [
            { id: "ticket",  name: "Ticket",  },
            { id: "customer",  name: "Customer",  },
            { id: "company",  name: "Company",  },
        ];
        return Promise.resolve(entities);
    }

}

module.exports = WorkflowService;
