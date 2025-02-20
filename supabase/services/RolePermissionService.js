const _ = require("lodash");
const errors = require("../errors");
const BaseService = require("./BaseService");
const RolePermissionUtility = require("../db/utilities/RolePermissionUtility");

class RolePermissionService extends BaseService {
    constructor() {
        super();
        this.entityName = "Permission";
        this.utilityInst = new RolePermissionUtility();
        this.listingFields = ["id", "name", "createdBy", "createdAt"];
        this.updatableFields = ["id", "name", "description"];
    }

    async createPermission(requestedData = {}) {
        try {
            let data = {
                id: requestedData.id,
                name: requestedData.name,
                description: requestedData.description || null,
                createdBy: requestedData.created_by
            };
            
            return this.create(data).catch(err => {
                if (err instanceof errors.Conflict) {
                    return Promise.reject(new errors.AlreadyExist("Permission already exists."));
                }
                return Promise.reject(err);
            });
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updatePermission(permission_id, updateValues) {
        try {
            await this.update({ id: permission_id }, updateValues);
            return Promise.resolve();
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deletePermission(id) {
        try {
            return await this.softDelete(id);
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = RolePermissionService;
