const BaseHandler = require('./BaseHandler');
const UserService = require('../services/UserService');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const errors = require('../errors');
const { defineAbilityFor } = require('../ability/defineAbility');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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
    try {
      const email = req.authUser.email;
      const { password, new_password: newPassword, logout_all: logoutAll } = req.body;

      const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
      if (error || !user) throw new errors.InvalidCredentials();

      const match = await bcrypt.compare(password, user.password);
      if (!match) throw new errors.InvalidCredentials();

      const hash = await bcrypt.hash(newPassword, 10);
      await supabase.from('users').update({ password: hash }).eq('id', user.id);

      if (logoutAll) {
        await supabase.from('userAccessTokens').delete().eq('user_id', user.id);
      }

      return this.responder(req, reply, Promise.resolve({ message: 'Password changed successfully.' }));
    } catch (err) {
      return this.responder(req, reply, Promise.reject(err));
    }
  }

}

module.exports = ProfileHandler;
