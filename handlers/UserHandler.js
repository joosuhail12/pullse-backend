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
      roleIds: req.body.roleIds || [req.body.role], // Support both roleIds array and single role
      defaultWorkSpace: defaultWorkspaceId
    };

    console.log(userData, "userData")

    // Create the user
    const createdUser = await inst.createUser(userData);

    // Format and return the created user only
    const result = {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: 'admin', // You can fetch the actual role name if needed
      status: createdUser.status,
      teamId: createdUser.teamId,
      createdBy: createdUser.createdBy,
      createdAt: createdUser.created_at,
      lastActive: createdUser.lastLoggedInAt,
      avatar: createdUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(createdUser.name)}`,
      permissions: ['view_reports'],
    };

    return this.responder(req, reply, Promise.resolve(result));
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
    let result = await inst.paginate(filters);
    result = result.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email || `${user.name.replace(/\s+/g, '').toLowerCase()}@example.com`,
      role: user.roleIds ? user.roleIds.name : null,
      status: user.status,
      teamId: user.teamId,
      createdBy: user.createdBy,
      createdAt: user.created_at,
      lastActive: user.lastLoggedInAt,
      avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`,
      permissions: ['view_reports'],
    }));
    return this.responder(req, reply, Promise.resolve(result));
  }

  async showUserProfile(req, reply) {
    let clientId = req.authUser.clientId;
    let inst = new UserService();
    const result = await inst.getDetails(req.authUser.id, clientId);
    const user = result.data;
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleIds ? user.roleIds.name : null,
      status: user.status,
      teamId: user.teamId,
      createdBy: user.createdBy,
      createdAt: user.created_at,
      lastActive: user.lastLoggedInAt,
      avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`,
      permissions: ['view_reports'],
    }
    return this.responder(req, reply, Promise.resolve(userData));
  }

  async showUserDetail(req, reply) {
    let clientId = req.authUser.clientId;
    let inst = new UserService();
    const result = await inst.getDetails(req.params.user_id, clientId);
    const user = result;
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleIds ? user.roleIds.name : null,
      status: user.status,
      teamId: user.teamId,
      createdBy: user.createdBy,
      createdAt: user.created_at,
      lastActive: user.lastLoggedInAt,
      avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`,
      permissions: ['view_reports'],
    }
    return this.responder(req, reply, Promise.resolve(userData));
  }

  async updateUser(req, reply) {
    let user_id = req.params.user_id;
    let clientId = req.authUser.clientId;
    let toUpdate = req.body;
    let inst = new UserService();

    // Transform the incoming data to the storage format
    let storageFormat = {
      first_name: toUpdate.first_name,
      last_name: toUpdate.last_name,
      email: toUpdate.email,
      roleIds: toUpdate.role,
      teamId: toUpdate.teamId,
      status: toUpdate.status,
      // Add any other fields that need to be stored
    };

    // Update the user
    await inst.updateUser({ user_id, clientId }, storageFormat);

    // Fetch the updated user details
    const result = await inst.getDetails(user_id, clientId);
    const user = result;
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.roleIds ? user.roleIds.name : null,
      status: user.status,
      teamId: user.teamId,
      createdBy: user.createdBy,
      createdAt: user.created_at,
      lastActive: user.lastLoggedInAt,
      avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`,
      permissions: ['view_reports'],
    };

    return this.responder(req, reply, Promise.resolve(userData));
  }

  async deleteUser(req, reply) {
    let user_id = req.params.user_id;
    let inst = new UserService();
    return this.responder(req, reply, inst.deleteUser(user_id));
  }

}

module.exports = UserHandler;
