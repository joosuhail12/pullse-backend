const BaseHandler = require('./BaseHandler');
const DemoRequestService = require('../services/DemoRequestService');


class DemoRequestHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createDemoRequest(req, reply) {
    let inst = new DemoRequestService();
    return this.responder(req, reply, inst.createDemoRequest(req.body));
  }

  async deleteDemoRequest(req, reply) {
    let inst = new DemoRequestService();
    return this.responder(req, reply, inst.deleteDemoRequest(username, password));
  }

}

module.exports = DemoRequestHandler;
