// handlers/CopilotProfileHandler.js
const BaseHandler = require('./BaseHandler');
const CopilotChatService = require('../services/CopilotChatService');

class CopilotChatHandler extends BaseHandler {
  constructor() {
    super();
  }

  async createConversation(req, reply) {
    let inst = new CopilotChatService();
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;
    return this.responder(req, reply, inst.createConversation(req.body));
  }
  
    async getConversation(req, reply) {
        const inst = new CopilotChatService();
        const query = {
            id: req.params.id,
            createdBy: req.authUser.id
        };
        return this.responder(req, reply, inst.getConversation(query));
    }

    async createMessage(req, reply) {
        const inst = new CopilotChatService();
        const query = {
            id: req.params.id,
            createdBy: req.authUser.id
        };
        return this.responder(req, reply, inst.createMessage(req.body, query));
    }
}

module.exports =  CopilotChatHandler;
