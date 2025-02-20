const Promise = require("bluebird");
const errors = require("../errors");
const ChatbotDocumentUtility = require('../db/utilities/ChatBotDocumentUtility');
const ChatBotExternalService = require("../ExternalService/ChatBotExternalService");
const BaseService = require("./BaseService");
const _ = require("lodash");

class ChatbotQueryService extends BaseService {
    constructor() {
        super();
        this.utilityInst = new ChatbotDocumentUtility();
        this.entityName = 'ChatbotQuery';
        this.listingFields = ["id", "title", "type", "chatbotIds", "createdBy", "createdAt", "-id"];
        this.updatableFields = ["title", "type", "chatbotIds", "filePath"];
    }

    async getAnswer({ query, botId, workspaceId, clientId, createdBy }) {
        try {
            let inst = new ChatBotExternalService();
            let res = await inst.sendQuestion(botId, query, clientId);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    async updateChatbotDocument(chatbot_document_id, updateValues) {
        try {
            await this.update({ id: chatbot_document_id }, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }

    async deleteChatbotDocument(id) {
        try {
            let res = await this.softDelete(id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ title, type, chatbotId, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = {};
        filters.workspaceId = workspaceId;
        filters.clientId = clientId;

        if (title) {
            filters.title = { ilike: `%${title}%` };
        }
        if (type) {
            filters.type = type;
        }
        if (chatbotId) {
            filters.chatbotIds = chatbotId;
        }
        if (createdFrom) {
            filters.createdAt = filters.createdAt || {};
            filters.createdAt['gte'] = createdFrom;
        }
        if (createdTo) {
            filters.createdAt = filters.createdAt || {};
            filters.createdAt['lt'] = createdTo;
        }

        return filters;
    }
}

module.exports = ChatbotQueryService;
