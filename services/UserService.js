// const camelcaseKeys = require('camelcase-keys');
const _ = require("lodash");
const Promise = require("bluebird");
const UserUtility = require("../db/utilities/UserUtility");
const BaseService = require("./BaseService");
const errors = require("../errors");
const WorkspaceService = require("./WorkspaceService");

class UserService extends BaseService {

    constructor(fields=null, dependencies=null) {
        super();
        this.entityName = "User";
        this.utilityInst = new UserUtility();
        this.WorkspaceService = WorkspaceService;
        this.listingFields = [ "id", "name", "roleIds", "status", "teamId", "createdBy", "createdAt", "lastLoggedInAt", "-_id" ];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = [ "fName", "lName", "name", "teamId", "status", ]; //removed roleids
    }
    
    async createUser({ fName, lName, email, confirmPassword, password, createdBy, clientId }) {
        try {
            let name = this.name(fName, lName);
            if (confirmPassword && confirmPassword != password) {
                return new errors.BadRequest("confirm password and password does not match.");
            }
            password = await this.bcryptToken(password);
            return this.create({ fName, lName, name, email, password, createdBy, clientId }).catch(err => {
                if (err instanceof errors.Conflict) {
                    return new errors.AlreadyExist("User already exist.");
                }
                return Promise.reject(err);
            });
        } catch(e) {
            console.log("Error in create() of UserService", e);
            return Promise.reject(e);
        }
    }
  constructor(fields = null, dependencies = null) {
    super();
    this.entityName = "User";
    this.utilityInst = new UserUtility();
    this.WorkspaceService = WorkspaceService;
    this.listingFields = [
      "id",
      "name",
      "roleIds",
      "status",
      "teamId",
      "createdBy",
      "createdAt",
      "lastLoggedInAt",
      //   "defaultWorkspaceId",
      "-_id",
    ];
    if (fields) {
      this.listingFields = fields;
    }
    this.updatableFields = ["fName", "lName", "name", "teamId", "status"]; //removed roleids
  }

  async createUser({
    fName,
    lName,
    email,
    confirmPassword,
    password,
    createdBy,
    clientId,
  }) {
    try {
      let name = this.name(fName, lName);
      if (confirmPassword && confirmPassword != password) {
        return new errors.BadRequest(
          "confirm password and password does not match."
        );
      }
      password = await this.bcryptToken(password);
      return this.create({
        fName,
        lName,
        name,
        email,
        password,
        createdBy,
        clientId,
      }).catch((err) => {
        if (err instanceof errors.Conflict) {
          return new errors.AlreadyExist("User already exist.");
        }
        return Promise.reject(err);
      });
    } catch (e) {
      console.log("Error in create() of UserService", e);
      return Promise.reject(e);
    }
  }

  async getDetails(id, clientId) {
    try {
      let user = await this.findOne({ id, clientId });
      if (_.isEmpty(user)) {
        return Promise.reject(
          new errors.NotFound(this.entityName + " not found.")
        );
      }
      if (!user.defaultWorkspaceId) {
        let defaultWorkspace = await this.getUserDefaultWorkspace(user).catch(
          () => {
            return { id: null };
          }
        );
        user.defaultWorkspaceId = defaultWorkspace.id;
      }
      return user;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getUserDefaultWorkspace(user) {
    try {
      let clientId = user.clientId;
      let defaultWorkspace;
      let inst = new this.WorkspaceService();
      if (!user.defaultWorkspaceId) {
        defaultWorkspace = await inst.findOne({ clientId });
      } else {
        defaultWorkspace = await inst.findOne({
          id: user.defaultWorkspaceId,
          clientId,
        });
      }
      if (!defaultWorkspace) {
        return Promise.reject(
          new errors.NotFound("User don't have a workspace.")
        );
      }
      return defaultWorkspace;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async updateUser({ user_id, clientId }, updateValues) {
    try {
      await this.update({ id: user_id, clientId }, updateValues);
      return Promise.resolve();
    } catch (e) {
      console.log("Error in update() of UserService", e);
      return Promise.reject(e);
    }
  }

  async deleteUser(id) {
    try {
      let res = await this.softDelete(id);
      return res;
    } catch (err) {
      return this.handleError(err);
    }
  }

  name(fName, lName) {
    return fName.trim() + " " + lName.trim();
  }

  parseFilters({
    name,
    email,
    createdFrom,
    roleId,
    teamId,
    createdTo,
    clientId,
    defaultWorkspaceId,
  }) {
    let filters = {};
    filters.clientId = clientId;

    if (name) {
      filters.name = { $regex: `^${name}`, $options: "i" };
    }
    if (email) {
      filters.email = email;
    }

    if (roleId) {
      filters.roleIds = roleId;
    }
    if (defaultWorkspaceId) {
      filters.defaultWorkspaceId = defaultWorkspaceId;
    }
    if (teamId) {
      filters.teamId = teamId;
    }

    if (createdFrom) {
      if (!filters.createdAt) {
        filters.createdAt = {};
      }
      filters.createdAt["$gte"] = createdFrom;
    }
    if (createdTo) {
      if (!filters.createdAt) {
        filters.createdAt = {};
      }
      filters.createdAt["$lt"] = createdTo;
    }

    return filters;
  }
}

module.exports = UserService;
