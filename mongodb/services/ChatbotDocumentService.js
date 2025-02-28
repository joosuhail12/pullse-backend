const Promise = require("bluebird");
const errors = require("../errors");
const ChatbotDocumentUtility = require('../db/utilities/ChatBotDocumentUtility');
const ChatBotExternalService = require("../ExternalService/ChatBotExternalService");
const BaseFileSystem = require("../FileManagement/BaseFileSystem");
const BaseService = require("./BaseService");
const _ = require("lodash");
const path = require("path");
const { v4: uuid } = require('uuid');
const LLMServiceExternalService = require("../ExternalService/LLMServiceExternalService");

class ChatbotDocumentService extends BaseService {

    constructor(fields=null, dependencies=null) {
        super();
        this.utilityInst = new ChatbotDocumentUtility();
        this.ChatBotProfileService = dependencies?.ChatBotProfileService;
        this.entityName = 'ChatbotDocument';
        this.listingFields = ["id", "title", "type", "chatbotIds", "createdBy", "createdAt", "-_id"];
        this.updatableFields = ["title", "type", "chatbotIds", "filePath"];
    }

    async addChatbotDocument({ title, type, chatbotIds, link, content, workspaceId, clientId, createdBy }, fileInst=null) {
        try {
            if (type === 'link') {
                if (!link) {
                    return Promise.reject(new errors.BadRequest(`Link is required for doc type: ${type}`));
                }
                // call scraper asynchronously to get the content
            }

            let id = uuid();
            let filePath, res;
            let document = await this.create({ id, title, type, content, link, chatbotIds, filePath, workspaceId, clientId, createdBy });
            let metadata = {
                title,
                clientId,
                chatbotIds,
                doc_id: document.id
            };
            let llmInstance = new LLMServiceExternalService();
            if (type === 'content') {
                if (!content) {
                    return Promise.reject(new errors.BadRequest(`Content is required for doc type: ${type}`));
                }
                // create a file with the text content
                let fs = new BaseFileSystem();
                let fileDir = path.join(`./file-storage/${clientId}/${workspaceId}/chatbot-document/${id}/content`);
                await fs.mkdir(fileDir);
                filePath = path.join(fileDir, title + '.txt');
                await fs.writeFile(filePath, content);
                llmInstance.addData('text', content, metadata);
            }

            if (type === 'file') {
                if (!fileInst) {
                    return Promise.reject(new errors.BadRequest(`File is required for doc type: ${type}`));
                }
                let fs = new BaseFileSystem();
                let fileDir = path.join(`./file-storage/${clientId}/${workspaceId}/chatbot-document/${id}/file`);
                await fs.mkdir(fileDir);
                filePath = path.join(fileDir, fileInst.name);
                await fileInst.mv(filePath);
                // put it in queue
                llmInstance.addDocument('pdf_file', filePath, metadata);
            }

            if (filePath) {
                let inst = new ChatBotExternalService();
                let docData = {
                    organizationId: clientId,
                    documentId: id,
                    documentSetId: clientId
                };
                // let res = await inst.uploadFile(filePath, docData);
            } else {
                // put it in queue
                llmInstance.addData(type, link, metadata);
            }

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

    async bulkAction({ action, chatbotIds, ids, workspaceId, clientId }) {
        try {
            let filters = { id: { $in: ids }, workspaceId, clientId };
            let updateValues = {};
            if (action === 'archive') {
                updateValues.archiveAt = new Date();
            }
            if (action === 'restore') {
                updateValues.archiveAt = null;
            }
            if (action === 'removeChatBots' || action === 'addChatBots' && chatbotIds) {
                let botProfileServiceInst = new this.ChatBotProfileService();
                let chatBotsCount = await botProfileServiceInst.count({ id: { $in: chatbotIds }, workspaceId, clientId });
                if (chatBotsCount !== chatbotIds.length) {
                    return Promise.reject(new errors.BadRequest("Invalid chatbot ids"));
                }
                if (action === 'removeChatBots') {
                    updateValues['$pull'] = { chatbotIds: { $in: chatbotIds } };
                } else {
                    updateValues['$push'] = { chatbotIds: { $each: chatbotIds } };
                }
            }
            await this.updateMany(filters, updateValues);
            return Promise.resolve();
        } catch (error) {
            return this.handleError(error);
        }
    }

    parseFilters({ title, type, chatbotId, excludeChatbotId, createdFrom, createdTo, workspaceId, clientId }) {
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
        if (excludeChatbotId) {
            filters.chatbotIds = {
                $ne: excludeChatbotId
            };
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

module.exports = ChatbotDocumentService;
