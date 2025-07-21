// handlers/CopilotProfileHandler.js
const BaseHandler = require('./BaseHandler');
const PreBuildActionService = require('../services/PreBuildActionService');

class PreBuildActionHandler extends BaseHandler {
  constructor() {
    super();
  }

  async getPreBuildActionById(req, reply) {
    let inst = new PreBuildActionService();
    const query = {
        id: req.params.id,
        clientId: req.authUser.clientId
    };
    return this.responder(req, reply, inst.getPreBuildActionById(query));
  }
  
    async getPreBuildActionByClientId(req, reply) {
        const inst = new PreBuildActionService();
        const query = {
            clientId: req.authUser.clientId
        };
        return this.responder(req, reply, inst.getPreBuildActionByClientId(query));
    }

    async getPrebuildSelectedApps(req, reply) {
        const inst = new PreBuildActionService();
        const query = {
            clientId: req.authUser.clientId,
            workspaceId: req.authUser.defaultWorkspaceId,
            userId: req.authUser.id
        };
        return this.responder(req, reply, inst.getPrebuildSelectedApps(query));
    }

    async generatePrebuildAppConnections(req, reply) {
        const inst = new PreBuildActionService();
        const query = {
            clientId: req.authUser.clientId,
            workspaceId: req.authUser.defaultWorkspaceId,
            userId: req.authUser.id,
            toolName: req.body.toolName
        };
        console.log(query, "query---");
        return this.responder(req, reply, inst.generatePrebuildAppConnections(query));
    }
}

module.exports =  PreBuildActionHandler;
