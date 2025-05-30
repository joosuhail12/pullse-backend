const BaseHandler = require('./BaseHandler');
const ChatBotProfileService = require('../services/ChatBotProfileService');
const LLMService = require('../services/LLMService');


class ChatBotProfileHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createBotProfile(req, reply) {
    const inst = new ChatBotProfileService();
    const createdBy = req.authUser.id;
    const clientId = req.authUser.clientId;
    const workspaceId = req.query.workspace_id;
  
    const data = {
      name: req.body.name,
      status: req.body.status,
      tone: req.body.tone,
      welcomeMessage: req.body.welcomeMessage,
      humanHandoffMessage: req.body.humanHandoffMessage,
      knowledgeBaseIds: req.body.knowledgeBaseIds,
      assistant_id: req.body.assistant_id,
      behavior: req.body.behavior,
      audienceRules: req.body.audienceRules,
      customInstructions: req.body.customInstructions,
      persona: req.body.persona,
      avatarUrl: req.body.avatarUrl,
      workspaceId,
      clientId,
      createdBy,
    };
  
    const res = await this.responder(req, reply, inst.createBotProfile(data));
    return res;
  }

  async listChatbotProfiles(req, reply) {
    const inst = new ChatBotProfileService();
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let res = await this.responder(req, reply, inst.fetchChatbotProfiles({ workspaceId, clientId }));
    return res;
  }

  async showChatbotProfileDetail(req, reply) {
    let clientId = req.authUser.clientId;
    let workspaceId = req.query.workspace_id;
    let inst = new ChatBotProfileService();
    return this.responder(req, reply, inst.getDetails(req.params.profile_id, workspaceId, clientId, true));
  }

  async updateChatbotProfile(req, reply) {
    let id = req.params.profile_id;
    let clientId = req.authUser.clientId;
    let workspaceId = req.query.workspace_id;

    let toUpdate = req.body;
    let inst = new ChatBotProfileService();
    return this.responder(req, reply, inst.updateChatbotProfile({ id, workspaceId, clientId }, toUpdate));
  }

  async deleteChatbotProfile(req, reply) {
    let id = req.params.profile_id;
    let clientId = req.authUser.clientId;
    let workspaceId = req.query.workspace_id;

    let inst = new ChatBotProfileService();
    return this.responder(req, reply, inst.deleteChatbotProfile({ id, workspaceId, clientId }));
  }

  async getAnswerFromBot(req, reply) {
    let id = req.params.profile_id;
    let clientId = req.authUser.clientId;
    let workspaceId = req.query.workspace_id;
    let inst = new ChatBotProfileService();
    let res = await this.responder(req, reply, inst.getAnswerFromBot({ id, clientId, workspaceId }, req.body.query));
    return res;
  }

  async getChatbotRuleFields(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = new ChatBotProfileService();
    return this.responder(req, reply, inst.getChatbotRuleFields(workspaceId, clientId));
  }
};

module.exports = ChatBotProfileHandler;
