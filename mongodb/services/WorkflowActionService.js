const Promise = require("bluebird");
const errors = require("../errors");
const WorkflowActionUtility = require('../db/utilities/WorkflowActionUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");
const { v4: uuid } = require("uuid");

class WorkflowActionService extends BaseService {

    constructor(fields=null, dependencies={}) {
        super();
        this.utilityInst = new WorkflowActionUtility();
        this.TicketService = dependencies.TicketService || null;
        this.WorkflowRuleService = dependencies.WorkflowRuleService || null;
        this.EmailService = dependencies.EmailService || null;
        this.entityName = 'WorkflowAction';
        this.listingFields = ["id", "name", "-_id"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = [ "name", "description", "summary", "position", "type", "attributes", "customAttributes", "fieldName", "fieldValue", "additionalData", ];
    }

    async validateActionTypeData(type, attributes) {
        if (type === "sendEmail") {
            let { to, subject, body } = attributes;
            if (_.isEmpty(to)) {
                return Promise.reject(new errors.ValidationError("To is required."));
            }
            if (_.isEmpty(subject)) {
                return Promise.reject(new errors.ValidationError("Subject is required."));
            }
            if (_.isEmpty(body)) {
                return Promise.reject(new errors.ValidationError("Body is required."));
            }
        }
        if (type == "createNewTicket") {
            let { ticketType, title, description } = attributes;
            if (_.isEmpty(ticketType)) {
                return Promise.reject(new errors.ValidationError("Ticket Type is required."));
            }
            if (_.isEmpty(title)) {
                return Promise.reject(new errors.ValidationError("Ticket Subject is required."));
            }
            if (_.isEmpty(description)) {
                return Promise.reject(new errors.ValidationError("Ticket Description is required."));
            }
        }
        return Promise.resolve();
    }

    async validateActionData(actionData, positionShouldBe) {
        let { name, type, position, attributes, customAttributes } = actionData;

        if (_.isEmpty(name)) {
            return Promise.reject(new errors.ValidationError("Action name is required."));
        }
        if (_.isEmpty(type)) {
            return Promise.reject(new errors.ValidationError("Action Type is required."));
        }
        if (position !== positionShouldBe) {
            return Promise.reject(new errors.ValidationError(`Position should be ${positionShouldBe}.`));
        }
        if (_.isEmpty(attributes) && _.isEmpty(customAttributes)) {
            return Promise.reject(new errors.ValidationError("Action attributes/customAttributes are empty."));
        }

        return this.validateActionTypeData(type, attributes);
    }

    async createOrUpdateActions(actions, createdBy, workspaceId, clientId) {
        try {
            if (_.isEmpty(actions)) {
                return Promise.reject(new errors.ValidationError("Actions are empty."));
            }
            let actionIds = [];
            let error = [];
            let position = 0;
            for (let action of actions) {
                if (_.isEmpty(action.name)) {
                    action.name = `Action ${uuid()}`;
                }
                if (_.isEmpty(action.position)) {
                    action.position = position;
                }
                if (action.id) {
                    await this.getDetails(action.id, workspaceId, clientId)
                    .catch(err => {
                        error.push({
                            position,
                            data: action,
                            message: `Action with id ${action.id} not found.`,
                        });
                    });
                    continue;
                }
                await this.validateActionData(action, position)
                .catch(err => {
                    error.push({
                        position,
                        data: action,
                        message: err.message,
                    });
                    return Promise.resolve(action);
                });
                let isExistsWithName = await this.count({ name: { $regex : action.name, $options: "i" }, clientId, workspaceId });
                if (isExistsWithName) {
                    error.push({
                        position,
                        data: action,
                        message: `Action with name ${action.name} already exists.`,
                    });
                }
                position++;
            }
            if (!_.isEmpty(error)) {
                return { actionIds, error };
            }
            for (let action of actions) {
                if (action.id) {
                    await this.update({ id: action.id }, _.pick(action, [ "name", "description", "summary", "position", "type", "attributes", "customAttributes", "fieldName", "fieldValue", "additionalData", ]));
                    actionIds.push(action.id);
                    continue;
                }
                let actionData = await this.create({ ...action, createdBy, workspaceId, clientId });
                actionIds.push(actionData.id);
            }
            return { actionIds, error };
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let workflowAction = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(workflowAction)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            return workflowAction;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateWorkflowAction({ id, workspaceId, clientId }, updateValues) {
        try {
            let workflowAction = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: workflowAction.id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }


    async deleteWorkflowAction({ id, workspaceId, clientId }) {
        try {
            let workflowAction = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(workflowAction.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = {};
        filters.workspaceId = workspaceId;
        filters.clientId = clientId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
        }

        if (createdFrom) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$gte'] = createdFrom;
        }
        if (createdTo) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$lt'] = createdTo;
        }

        return filters;
    }

    // Action: send email
    async sendEmailAction({ id, workspaceId, clientId }, { to, subject, body }) {
        try {
            let workflowAction = await this.getDetails(id, workspaceId, clientId);
            let inst = new this.EmailService();
            let res = await inst.sendEmail({ to, subject, html: body });
        } catch(err) {
            return this.handleError(err);
        }
    }

    // Action: create new ticket
    async createNewTicketAction(ticket, workspaceId, clientId) {
        try {
            let workflowAction = await this.getDetails(id, workspaceId, clientId);
            let inst = new this.TicketService()

        } catch (error) {
            return this.handleError(error);
        }
    }

    // Action: send message
}

module.exports = WorkflowActionService;
