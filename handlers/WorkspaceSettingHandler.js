const WorkspaceHandler = require('./WorkspaceHandler');

class WorkspaceSettingHandler extends WorkspaceHandler {

  constructor() {
    super();
  }

  /**
   * Gets the customer's chatbot setting
   * @param {Object} req - The request object.
   * @param {Object} reply - The reply object.
   * @returns {Object} The chatbot setting object.
   * @description
   * - Gets the workspace ID and client ID from the authenticated user.
   * - Calls the service instance method to get the workspace details by ID and client ID.
   * - Resolves the promise and returns the chatbot setting from the workspace object.
  */
  async getCustomerChatbotSetting(req, reply) {
    let user = req.authUser;
    let workspaceId = user.workspaceId;
    let clientId = user.clientId;
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.getDetails(workspaceId, clientId).then(workspace => Promise.resolve(workspace.chatbotSetting)));
  }

  async getChatbotSetting(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.getDetails(workspaceId, clientId).then(workspace => Promise.resolve(workspace.chatbotSetting)));
  }

  async updateChatbotSetting(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let chatbotSetting = req.body;
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.updateChatbotSetting({ id: workspaceId, clientId }, chatbotSetting));
  }

  async getSentimentSetting(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.getDetails(workspaceId, clientId).then(workspace => Promise.resolve(workspace.sentimentSetting)));
  }

  async updateSentimentSetting(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let sentimentSetting = req.body;
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.updateSentimentSetting({ id: workspaceId, clientId }, sentimentSetting));
  }

  async getQualityAssuranceSetting(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.getDetails(workspaceId, clientId).then(workspace => Promise.resolve(workspace.qualityAssuranceSetting)));
  }

  async updateQualityAssuranceSetting(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let qualityAssuranceSetting = req.body;
    let inst = this.ServiceInst;
    return this.responder(req, reply, inst.updateQualityAssuranceSetting({ id: workspaceId, clientId }, qualityAssuranceSetting));
  }
}

module.exports = WorkspaceSettingHandler;
