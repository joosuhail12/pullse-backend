const BaseHandler = require('./BaseHandler');
const ChatBotProfileService = require('../services/ChatBotProfileService');
const LLMService = require('../services/LLMService');


class ChatBotProfileHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createBotProfile(req, reply) {
    let inst = new ChatBotProfileService();
    let createdBy = req.authUser.id;
    let clientId = req.authUser.clientId;
    let workspaceId = req.query.workspace_id;
    let data = {
      name: req.body.name,
      status: req.body.status,
      channels: req.body.channels,
      audience: req.body.audience,
      rules: req.body.rules,
      introMessages: req.body.introMessages,
      handoverMessages: req.body.handoverMessages,
      answerMode: req.body.answerMode,
      afterAnswer: req.body.afterAnswer,
      ifCantAnswer: req.body.ifCantAnswer,
      workspaceId,
      clientId,
      createdBy
    };
    let res = await this.responder(req, reply, inst.createBotProfile(data));
    return res;
  }

  async listChatbotProfiles(req, reply) {
    let query = req.query;
    let clientId = req.authUser.clientId;
    let inst = new ChatBotProfileService();
    let filters = {
      name: query.name,
      status: query.status,
      channel: query.channel,
      audience: query.audience,
      answerMode: query.answer_mode,
      afterAnswer: query.after_answer,
      ifCantAnswer: req.body.if_cant_answer,
      workspaceId: query.workspace_id,
      createdFrom: query.created_from,
      createdTo: query.created_to,
      clientId,
    };
    let res = await this.responder(req, reply, inst.paginate(filters));
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

};

module.exports = ChatBotProfileHandler;
