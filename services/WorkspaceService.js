const Promise = require("bluebird");
const errors = require("../errors");
const WorkspaceUtility = require('../db/utilities/WorkspaceUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");
const config = require("../config");

class WorkspaceService extends BaseService {

    constructor(fields=null, dependencies={}) {
        super();
        this.utilityInst = new WorkspaceUtility();
        this.AuthService = dependencies.AuthService;
        this.entityName = 'Workspace';
        this.listingFields = ["id", "name", "-_id"];
        this.updatableFields = [ "name", "description", "chatbotSetting", "sentimentSetting", "qualityAssuranceSetting" ];
    }

    /**
     * Creates a new workspace
     * @param {Object} workspaceData - Workspace data object containing name, clientId, and createdBy.
     * @returns {Object} Created workspace object
     * @description
     - Finds an existing workspace by name and clientId to check for duplicates.
    - Creates a new workspace using the provided workspace data if no duplicate is found.
    - Catches any errors and handles them.
    */
    async createWorkspace(workspaceData) {
        try {
            let { name, clientId } = workspaceData;
            let workspace = await this.findOne({ name: { $regex : `^${name}$`, $options: "i" } , clientId });
            if (!_.isEmpty(workspace)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            workspace = await this.create(workspaceData);
            return workspace;
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, clientId) {
        try {
            let workspace = await this.findOne({ id, clientId });
            if (_.isEmpty(workspace)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            workspace = await this.utilityInst.populate('client', workspace);
            workspace.email = `${workspace.id}@${config.app.email_domain}`;
            let authInst = new this.AuthService();
            workspace.clientToken = authInst.generateJWTToken({client: (new Buffer(`${workspace.id}:${clientId}`)).toString('base64')});
            return workspace;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateWorkspace({ id, clientId }, updateValues) {
        try {
            let workspace = await this.getDetails(id, clientId);
            await this.update({ id: workspace.id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }


    async updateChatbotSetting({ id, clientId }, chatbotSetting) {
        try {
            let workspace = await this.getDetails(id, clientId);
            let updateValues = { chatbotSetting };
            await this.update({ id: workspace.id}, updateValues);
            return Promise.resolve();
        } catch (error) {
            return this.handleError(error);
        }
    }

    async updateSentimentSetting({ id, clientId }, sentimentSetting) {
        try {
            let workspace = await this.getDetails(id, clientId);
            let updateValues = { sentimentSetting };
            await this.update({ id: workspace.id}, updateValues);
            return Promise.resolve();
        } catch (error) {
            return this.handleError(error);
        }
    }

    async updateQualityAssuranceSetting({ id, clientId }, qualityAssuranceSetting) {
        try {
            let workspace = await this.getDetails(id, clientId);
            let updateValues = { qualityAssuranceSetting };
            await this.update({ id: workspace.id}, updateValues);
            return Promise.resolve();
        } catch (error) {
            return this.handleError(error);
        }
    }

    async deleteWorkspace({ id, clientId }) {
        try {
            let workspace = await this.getDetails(id, clientId);
            let res = await this.softDelete(workspace.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, clientId }) {
        let filters = {};
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

}

module.exports = WorkspaceService;
