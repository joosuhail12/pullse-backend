const BaseHandler = require('./BaseHandler');
const AuthService = require('../services/AuthService');
const UAParser = require('ua-parser-js')
const requestIp = require('request-ip');



class AuthHandler extends BaseHandler {

  constructor() {
    super();
  }

  async checkCredentials(req, reply) {
    // let username = req.body.email;
    let username = req.body.username;
    let password = req.body.password;
    let inst = new AuthService();
    try {
      const clientIp = requestIp.getClientIp(req);
      const userAgent = req.headers['user-agent'];
      let res = await inst.login(username, password, userAgent, clientIp);
      reply.setCookie('customerToken', res.accessToken.token, {
        maxAge: res.accessToken.expiry,
        expires: res.accessToken.expiry,
        path: '/',
        // signed: true
      });
      reply.setCookie('workspcaeId', res.defaultWorkspaceId, {
        maxAge: res.accessToken.expiry,
        expires: res.accessToken.expiry,
        path: '/',
        // signed: true
      });
      return this.responder(req, reply, Promise.resolve(res));
    } catch (error) {
      console.log(error);
      return this.responder(req, reply, Promise.reject(res));
    }

  }

  async forgetPassword(req, reply) {
    let email = req.body.email;
    let inst = new AuthService();
    return this.responder(req, reply, inst.forgetPassword(email));
  }

  async resetPassword(req, reply) {
    let token = req.body.token;
    let password = req.body.password;
    let inst = new AuthService();
    return this.responder(req, reply, inst.resetPassword(token, password));
  }

  async logoutUser(req, reply) {
    let token = req.cookies.customerToken;
    console.log(req.cookies.customerToken);
    // todo: delete token from db
    // reply.clearCookie('customerToken');
    reply.clearCookie('customerToken');
    // reply.setCookie('customerToken', null, {
    //   path: '/',
    //   maxAge: Date.now(1),
    //   expires: Date.now(1),
    // });
    return this.responder(req, reply, Promise.resolve());
  }

}

module.exports = AuthHandler;
