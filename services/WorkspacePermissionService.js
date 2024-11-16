const Promise = require("bluebird");
const errors = require("../errors");
const WorkspacePermissionUtility = require('../db/utilities/WorkspacePermissionUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");

class WorkspacePermissionService extends BaseService {
    constructor(fields = null, dependencies = {}) {
        super();
        this.utilityInst = new WorkspacePermissionUtility();
        this.UserService = dependencies.UserService;
        this.entityName = 'WorkspacePermission';
        this.listingFields = ["id", "userId", "workspaceId", "role", "-_id", "createdBy"];
        this.updatableFields = ["role"];
    }
    /**
     * Creates a new workspace permission
     * @param {Object} permissionData - Contains userId, clientId, workspaceId, role, and createdBy
     * @returns {Object} Created workspace permission object
     */
    async createWorkspacePermission(permissionData) {
        try {
            const { userId, clientId, workspaceId, role, createdBy } = permissionData;
            // Check if permission already exists for user in this workspace
            let existingPermission = await this.findOne({ userId, workspaceId, clientId });
            if (!_.isEmpty(existingPermission)) {
                return Promise.reject(new errors.NotFound(`Permission already exists for this user in the workspace.`));
            }
            // Create new permission record
            const workspacePermission = await this.create({ userId, clientId, workspaceId, role, createdBy });
            const userIst = new this.UserService()
            let user = await userIst.findOne({id:userId});
            if(!user.defaultWorkspaceId){
                userIst.updateOne({id:userId},{defaultWorkspaceId:workspaceId});
            }
            return workspacePermission;
        } catch (err) {
            return this.handleError(err);
        }
    }

    /**
     * Gets details of a workspace permission by ID
     * @param {String} id - Permission ID
     * @returns {Object} Workspace permission details
     */
    async getDetails(id, clientId) {
        try {
            let workspacePermission = await this.findOne({ id, clientId });
            if (_.isEmpty(workspacePermission)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }
            return workspacePermission;
        } catch (err) {
            return this.handleError(err);
        }
    }

    /**
     * Updates a workspace permission
     * @param {String} id - Permission ID
     * @param {Object} updateValues - Fields to update
     */
    async updateWorkspacePermission(id, updateValues) {
        try {
            let permission = await this.getDetails(id);
            await this.update({ id: permission.id }, updateValues);
            return Promise.resolve();
        } catch (err) {
            return this.handleError(err);
        }
    }

    /**
     * Deletes (soft delete) a workspace permission by ID
     * @param {String} id - Permission ID
     */
    async deleteWorkspacePermission(id) {
        try {
            let permission = await this.getDetails(id);
            let res = await this.softDelete(permission.id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    /**
     * Parses filter options for listing permissions
     * @param {Object} filters - Filtering options
     */
    parseFilters({ userId, workspaceId, role, createdFrom, createdTo }) {
        let filterConditions = {};
        
        if (userId) filterConditions.userId = userId;
        if (workspaceId) filterConditions.workspaceId = workspaceId;
        if (role) filterConditions.role = role;

        if (createdFrom || createdTo) {
            filterConditions.createdAt = {};
            if (createdFrom) filterConditions.createdAt['$gte'] = createdFrom;
            if (createdTo) filterConditions.createdAt['$lte'] = createdTo;
        }

        return filterConditions;
    }
}

module.exports = WorkspacePermissionService;
