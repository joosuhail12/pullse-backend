const Promise = require("bluebird");
const errors = require("../errors");
const ChatbotDocumentUtility = require('../db/utilities/ChatBotDocumentUtility');
const ChatBotExternalService = require("../ExternalService/ChatBotExternalService");
const BaseFileSystem = require("../FileManagement/BaseFileSystem");
const BaseService = require("./BaseService");
const _ = require("lodash");

class ChatbotQueryService extends BaseService {

    constructor() {
        super();
        this.utilityInst = new ChatbotDocumentUtility();
        this.entityName = 'ChatbotQuery';
        this.listingFields = ["id", "title", "type", "chatbotIds", "createdBy", "createdAt", "-_id"];
        this.updatableFields = ["title", "type", "chatbotIds", "filePath"];
    }

    async getAnswer({ query, botId, workspaceId, clientId, createdBy }) {
        try {
            let inst = new ChatBotExternalService();
            // (docSetId, question, clientId)
            let res = await inst.sendQuestion(filePath, docData);
            let toUpdate = { filePath };
            if (content) {
                toUpdate['content'] = content;
            }
            await this.update({ id: document.id }, toUpdate);
            return document;
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
            filters.title = { $regex : `^${title}`, $options: "i" };
        }
        if (type) {
            filters.type = type;
        }
        if (chatbotId) {
            filters.chatbotIds = chatbotId;
        }

        if (createdFrom) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$gte'] = createdFrom;
        }
        if (createdTo) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$lt'] = createdTo;
        }

        return filters;
    }
}

module.exports = ChatbotQueryService;
