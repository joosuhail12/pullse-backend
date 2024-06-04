const BaseHandler = require('./BaseHandler');
const RolePermissionService = require('../services/RolePermissionService');


class RolePermissionHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createPermission(req, reply) {
    let inst = new RolePermissionService();
    req.body.created_by = 'User';
    return this.responder(req, reply, inst.createPermission(req.body));
  }

  async listPermission(req, reply) {
    let inst = new RolePermissionService();
    return this.responder(req, reply, inst.paginate(req.query));
  }

  async showPermissionDetail(req, reply) {
    let inst = new RolePermissionService();
    return this.responder(req, reply, inst.findOrFail(req.params.permission_id));
  }

  async updatePermission(req, reply) {
    let permission_id = req.params.permission_id;
    let toUpdate = req.body;
    let inst = new RolePermissionService();
    return this.responder(req, reply, inst.updatePermission(permission_id, toUpdate));
  }

  async deletePermission(req, reply) {
    let permission_id = req.params.permission_id;
    let inst = new RolePermissionService();
    return this.responder(req, reply, inst.deletePermission(permission_id));
  }

}

module.exports = RolePermissionHandler;
