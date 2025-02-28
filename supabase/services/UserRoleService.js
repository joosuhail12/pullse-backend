const Promise = require("bluebird");
const errors = require("../errors");
const UserRoleUtility = require('../db/utilities/UserRoleUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");

class UserRoleService extends BaseService {

    constructor() {
        super();
        this.utilityInst = new UserRoleUtility();
        this.entityName = "User Role";
        this.listingFields = ["id", "name", "description", "permissions", "createdBy", "createdAt"];
        this.updatableFields = ["name", "description", "permissions"];
    }

    async createRole(data) {
        try {
            let { name, clientId, workspaceId } = data;
            let existingRole = await this.findOne({ name: { $ilike: `%${name}%` }, clientId, workspaceId });
            if (!_.isEmpty(existingRole)) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${name}" already exists.`));
            }
            return this.create(data);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let role = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(role)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }
            return role;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateRole({ id, workspaceId, clientId }, updateValues) {
        try {
            let role = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: role.id }, updateValues);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteRole(id, workspaceId, clientId) {
        try {
            let role = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(role.id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = { workspaceId, clientId };

        if (name) {
            filters.name = { $ilike: `%${name}%` };
        }

        if (createdFrom) {
            filters.createdAt = { $gte: createdFrom };
        }
        if (createdTo) {
            filters.createdAt = { ...filters.createdAt, $lte: createdTo };
        }

        return filters;
    }
}

module.exports = UserRoleService;
