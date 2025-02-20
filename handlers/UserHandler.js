const BaseHandler = require('./BaseHandler');
const UserService = require('../services/UserService');


class UserHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createUser(req, reply) {
    let inst = new UserService();
    let clientId = req.authUser.clientId;
    let createdBy = req.authUser.id;
    const { workspace_id } = req.query;
    let defaultWorkspaceId = workspace_id ? workspace_id : req.authUser.defaultWorkspaceId;
    let userData = {
      fName: req.body.first_name,
      lName: req.body.last_name,
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirm_password,
      createdBy: createdBy,
      clientId: clientId,
      roleIds: [req.body.role],
      defaultWorkSpace: defaultWorkspaceId
    };
    return this.responder(req, reply, inst.createUser(userData));
  }

  async listUsers(req, reply) {
    let clientId = req.authUser.clientId;
    let filters = {
      name: req.query.name,
      email: req.query.email,
      roleId: req.query.roleId,
      teamId: req.query.teamId,
      createdFrom: req.query.created_from,
      createdTo: req.query.created_to,
      clientId: clientId,
    };
    let inst = new UserService();
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showUserProfile(req, reply) {
    let clientId = req.authUser.clientId;
    let inst = new UserService();
    return this.responder(req, reply, inst.getDetails(req.authUser.id, clientId));
  }

  async showUserDetail(req, reply) {
    let clientId = req.authUser.clientId;
    let inst = new UserService();
    return this.responder(req, reply, inst.getDetails(req.params.user_id, clientId));
  }

  async updateUser(req, reply) {
    let user_id = req.params.user_id;
    let clientId = req.authUser.clientId;
    let toUpdate = req.body;
    let inst = new UserService();
    return this.responder(req, reply, inst.updateUser({ user_id, clientId }, toUpdate));
  }

  async deleteUser(req, reply) {
    let user_id = req.params.user_id;
    let inst = new UserService();
    return this.responder(req, reply, inst.deleteUser(user_id));
  }

}

module.exports = UserHandler;
