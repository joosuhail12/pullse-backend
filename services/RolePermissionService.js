const _ = require("lodash");
const Promise = require("bluebird");
const RolePermissionUtility = require('../db/utilities/RolePermissionUtility');
const BaseService = require("./BaseService");
const errors = require("../errors");

class RolePermissionService extends BaseService {

    constructor() {
        super();
        this.entityName = "Permission";
        this.utilityInst = new RolePermissionUtility();
        this.listingFields = [ "id", "name", "createdBy", "createdAt", "-_id" ];
        this.updatableFields = [ "id", "name", "description", ];
    }

    async createPermission(requestedData = {}) {
        try {
            let data = {};
            data.id = requestedData.id;
            data.name = requestedData.name;
            data.description = requestedData.description || null;
            data.createdBy = requestedData.created_by;
            return this.create(data).catch(err => {
                if (err instanceof errors.Conflict) {
                    return new errors.AlreadyExist("Permission already exist.")
                }
                return Promise.reject(err);
            });
        } catch(err) {
            return this.handleError(err);
        }
    }

    async updatePermission(permission_id, updateValues) {
        try {
            await this.update({ id: permission_id }, updateValues);
            return Promise.resolve();
        } catch(err) {
            return this.handleError(err);
        }
    }

    async deletePermission(id) {
        try {
            let res = await this.softDelete(id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

}

module.exports = RolePermissionService;
