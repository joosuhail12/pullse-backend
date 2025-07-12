const BaseHandler = require('./BaseHandler');
const UserRoleService = require('../services/UserRoleService');


class UserRoleHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createRole(req, reply) {
    let inst = new UserRoleService();
    req.body.created_by = 'User';
    return this.responder(req, reply, inst.createRole(req.body));
  }

  async listRoles(req, reply) {
    let inst = new UserRoleService();
    // Allow excludeAdminRoles to be controlled via query param, default true
    const excludeAdminRoles = req.query && typeof req.query.excludeAdminRoles !== 'undefined' ? req.query.excludeAdminRoles === 'true' : true; // # ai generated
    return this.responder(req, reply, inst.listAvailableRoles({ excludeAdminRoles }));
  }

  async showRoleDetail(req, reply) {
    let inst = new UserRoleService();
    return this.responder(req, reply, inst.findOrFail(req.params.role_id));
  }

  async updateRole(req, reply) {
    let role_id = req.params.role_id;
    let toUpdate = req.body;
    let inst = new UserRoleService();
    return this.responder(req, reply, inst.updateRole(role_id, toUpdate));
  }

  async deleteRole(req, reply) {
    let role_id = req.params.role_id;
    let inst = new UserRoleService();
    return this.responder(req, reply, inst.deleteRole(role_id));
  }

}

module.exports = UserRoleHandler;
