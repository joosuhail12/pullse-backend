const BaseHandler = require('./BaseHandler');
const ClientService = require('../services/ClientService');


class ClientHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createClient(req, reply) {
    let name = req.body.name;
    let status = req.body.status;
    let owner = req.body.owner;
    let createdBy = req.authUser.id;
    let inst = new ClientService();
    let res = await this.responder(req, reply, inst.createClient({ name, status, owner, createdBy }));
    return res;
  }

  async listClients(req, reply) {
    let query = req.query;
    let inst = new ClientService();
    let res = await this.responder(req, reply, inst.paginate(query));
    return res;
  }

  async showClientDetail(req, reply) {
    let client_id = req.params.client_id;
    let inst = new ClientService();
    let res = await this.responder(req, reply, inst.findOrFail(client_id));
    return res;
  }

  async updateClient(req, reply) {
    let client_id = req.params.client_id;
    let toUpdate = req.body;
    let inst = new ClientService();
    return this.responder(req, reply, inst.updateClient(client_id, toUpdate));
  }

  async deleteClient(req, reply) {
    let client_id = req.params.client_id;
    let inst = new ClientService();
    let res = await this.responder(req, reply, inst.deleteClient(client_id));
    return res;
  }

}

module.exports = ClientHandler;
