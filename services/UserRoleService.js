const _ = require("lodash");
const Promise = require("bluebird");
const UserRoleUtility = require('../db/utilities/UserRoleUtility');
const BaseService = require("./BaseService");
const errors = require("../errors");

class UserRoleService extends BaseService {

    constructor() {
        super();
        this.entityName = "Role";
        this.utilityInst = new UserRoleUtility();
        this.listingFields = [ "id", "name", "createdBy", "createdAt", "-_id" ];
        this.updatableFields = [ "name", "description", "permissions", ];
    }

    async createRole(requestedData = {}) {
        try {
            let roleData = {};
            // let { role_name, description, permissions, created_by }
            roleData.name = requestedData.name;
            roleData.description = requestedData.description || null;
            roleData.permissions = requestedData.permissions || [];
            roleData.createdBy = requestedData.created_by;
            return this.create(roleData);
        } catch(e) {
            console.log("Error in create() of UserRoleService", e);
            return Promise.reject(e);
        }
    }


    async updateRole(role_id, updateValues) {
        try {
            await this.update({ id: role_id }, updateValues);
            return Promise.resolve();
        } catch(e) {
            console.log("Error in update() of UserRoleService", e);
            return Promise.reject(e);
        }
    }

    async deleteRole(id) {
        try {
            let res = await this.softDelete(id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

}

module.exports = UserRoleService;
