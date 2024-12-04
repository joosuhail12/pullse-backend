const BaseHandler = require('./BaseHandler');
const UserService = require('../services/UserService');
const AuthService = require('../services/AuthService');
const { defineAbilityFor } = require('../ability/defineAbility');

class ProfileHandler extends BaseHandler {

  constructor() {
    super();
  }

  async showUserProfile(req, reply) {
    const { id, clientId } = req.authUser;
    const inst = new UserService();
    return this.responder(req, reply, inst.getDetails(id, clientId));
  }

  async getAbilities(req,reply){
      let user = req.user;
      let availibilites =  defineAbilityFor(user)
      return this.responder(req, reply, Promise.resolve(availibilites.rules));
  }

  async updateUserProfile(req, reply) {
    const { id, clientId } = req.authUser;
    const inst = new UserService();
    const { first_name, last_name } = req.body;
    const name = inst.name(first_name || req.authUser.fName, last_name || req.authUser.lName);
    const toUpdate = { name, fName: first_name, lName: last_name };
    return this.responder(req, reply, inst.updateUser({ user_id: id, clientId }, toUpdate));
  }

  async setDefaultWorkspace(req, reply) {
    const { id, clientId } = req.authUser;
    const inst = new UserService();
    const { workspaceId } = req.body;
    const toUpdate = { defaultWorkspaceId:workspaceId };
    return this.responder(req, reply, inst.updateUser({ user_id: id, clientId }, toUpdate));
  }



  async changePassword(req, reply) {
    let email = req.authUser.email;
    let inst = new AuthService();
    let password = req.body.password;
    let newPassword = req.body.new_password;
    let logoutAll = req.body.logout_all;
    return this.responder(req, reply, inst.changePassword(email, {password, newPassword}, logoutAll));
  }

}

module.exports = ProfileHandler;
