const Promise = require("bluebird");
const errors = require("../errors");
const EventWorkflowUtility = require('../db/utilities/EventWorkflowUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");

class EventWorkflowService extends BaseService {

    constructor(fields=null, dependencies={}) {
        super();
        this.utilityInst = new EventWorkflowUtility();
        this.WorkflowService = dependencies.WorkflowService;
        this.entityName = 'Event Workflow';
        this.listingFields = ["id", "name", "eventId", "workflowId", "-_id"];
        this.updatableFields = [ "name", "description", "eventId", "workflowId", "archiveAt"];
    }

    async createEventWorkflow(eventWorkflowData) {
        try {
            let { eventId, workflowId, clientId, workspaceId } = eventWorkflowData;
            let workflowServiceInst = new this.WorkflowService();
            let workflow = await workflowServiceInst.getWorkflowDetails(workflowId, workspaceId, clientId);
            let eventWorkflow = await this.findOne({ eventId, workflowId, clientId, workspaceId });
            if (!_.isEmpty(eventWorkflow)) {
                return Promise.reject(new errors.AlreadyExist("This workflow is already attached on this event."));
            }
            return this.create(eventWorkflowData);
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let eventWorkflow = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(eventWorkflow)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            return eventWorkflow;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateEventWorkflow({ id, workspaceId, clientId }, updateValues) {
        try {
            let eventWorkflow = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: eventWorkflow.id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }


    async deleteEventWorkflow({ id, workspaceId, clientId }) {
        try {
            let eventWorkflow = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(eventWorkflow.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, eventId, workflowId, createdFrom, createdTo, archived, workspaceId, clientId }) {
        let filters = {};
        filters.workspaceId = workspaceId;
        filters.clientId = clientId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
        }

        if (eventId) {
            filters.eventId = eventId;
        }
        if (workflowId) {
            filters.workflowId = workflowId;
        }

        if (archived) {
            filters.archiveAt = { $ne: null };
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
}

module.exports = EventWorkflowService;
