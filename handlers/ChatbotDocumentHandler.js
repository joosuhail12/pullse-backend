const BaseHandler = require('./BaseHandler');
const ChatbotDocumentService = require('../services/ChatbotDocumentService');
const ChatBotProfileService = require('../services/ChatBotProfileService');

class ChatbotDocumentHandler extends BaseHandler {

  constructor() {
    super();
    let dependencies = { ChatBotProfileService };
    this.ChatbotDocumentServiceInst = new ChatbotDocumentService(null, dependencies);
  }

  async createChatbotDocument(req, reply) {
    let createdBy = req.authUser.id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let data = {
      title: req.body.title,
      link: req.body.link,
      type: req.body.doc_type,
      chatbotIds: req.body.chatbot_ids,
      content: req.body.content,
      createdBy,
      workspaceId,
      clientId
    };
    let fileInst = req.raw?.files?.data_file;
    let inst = this.ChatbotDocumentServiceInst;
    return this.responder(req, reply, inst.addChatbotDocument(data, fileInst));
  }

  async createSnippet(req, reply) {
    let inst = this.ChatbotDocumentServiceInst;
    return this.responder(req, reply, inst.addCreateSnippet(req.body));
  }

  async createLink(req, reply) {
    let inst = this.ChatbotDocumentServiceInst;
    return this.responder(req, reply, inst.addCreateLink(req.body));
  }

  async createDocument(req, reply) {
    let inst = this.ChatbotDocumentServiceInst;
    return this.responder(req, reply, inst.addCreateDocument(req.body));
  }

  async listChatbotDocument(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let filters = {
      title: req.query.title,
      type: req.query.doc_type,
      chatbotId: req.query.chatbot_id,
      excludeChatbotId: req.query.exclude_chatbot_id,
      createdFrom: req.query.created_from,
      createdTo: req.query.created_to,
      skip: req.query.skip,
      limit: req.query.limit,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      workspaceId,
      clientId
    };
    let inst = this.ChatbotDocumentServiceInst;
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showChatbotDocumentDetail(req, reply) {
    let inst = this.ChatbotDocumentServiceInst;
    return this.responder(req, reply, inst.findOrFail(req.params.chatbot_document_id));
  }

  async updateChatbotDocument(req, reply) {
    let chatbot_document_id = req.params.chatbot_document_id;
    let toUpdate = req.body;
    let inst = this.ChatbotDocumentServiceInst;
    return this.responder(req, reply, inst.updateChatbotDocument(chatbot_document_id, toUpdate));
  }

  async bulkAction(req, reply) {
    let action = req.body.action;
    let ids = req.body.ids;
    let chatbotIds = req.body.chatbot_ids;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let inst = this.ChatbotDocumentServiceInst;
    return this.responder(req, reply, inst.bulkAction({ action, chatbotIds, ids, workspaceId, clientId }));
  }

  async deleteChatbotDocument(req, reply) {
    let chatbot_document_id = req.params.chatbot_document_id;
    let inst = this.ChatbotDocumentServiceInst;
    return this.responder(req, reply, inst.deleteChatbotDocument(chatbot_document_id));
  }

}

module.exports = ChatbotDocumentHandler;
