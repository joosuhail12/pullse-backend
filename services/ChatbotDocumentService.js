const { v4: uuidv4 } = require('uuid');
const errors = require("../errors");
const ChatbotDocumentUtility = require('../db/utilities/ChatBotDocumentUtility');
const ChatBotExternalService = require("../ExternalService/ChatBotExternalService");
const BaseFileSystem = require("../FileManagement/BaseFileSystem");
const BaseService = require("./BaseService");
const _ = require("lodash");
const path = require("path");
const LLMServiceExternalService = require("../ExternalService/LLMServiceExternalService");
const AzureStorageService = require('../StorageService/AzureStorageService');
const { sendTaskMessage } = require('../serviceBusService/AzureServiceBus');
const fs = require('fs').promises;
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
class ChatbotDocumentService extends BaseService {
    constructor(fields = null, dependencies = null) {
        super();
        this.utilityInst = new ChatbotDocumentUtility();
        this.ChatBotProfileService = dependencies?.ChatBotProfileService;
        this.entityName = 'ChatbotDocument';
        this.listingFields = ["id", "title", "type", "chatbotIds", "createdBy", "createdAt"];
        this.updatableFields = ["title", "type", "chatbotIds", "filePath"];
        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
            credentials: {
                accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
                secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
            },
        });
    }

    async addCreateSnippet({ title,content,category,tags,isLive,description: description,status, contentType, folderId }, uesrId, clientId, workspaceId){
        try {
            const azureService = new AzureStorageService()
            await azureService.init()
            const url = await azureService.uploadSnippet(title, description, content)
            const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('name')
            .eq('id', clientId)
            .maybeSingle();
            await sendTaskMessage(url, title, description, content, 'text', uesrId, clientId, workspaceId, client.name, "snippet", folderId)
        } catch (err) {
            console.log(err)
            return this.handleError(err);
        }
    }

    async addCreateActionCenter({ title,content,category,tags,isLive,description: description,status, contentType, folderId }, uesrId, clientId, workspaceId){
        try {
            const bucketName = "pullse";
        } catch (err) {
            console.log(err)
            return this.handleError(err);
        }
    }

    async addCreateDocument({ title,file,category,tags,isLive,description: description,status, contentType, folderId }, uesrId, clientId, workspaceId){
        try {
            const bucketName = "pullse";

            // Generate unique key for the file
            const key = `document-${workspaceId}-${Date.now()}`;

            const fileBuffer = await fs.readFile(file.tempFilePath);

            // Upload to R2 using PutObjectCommand
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: fileBuffer,
                    ContentType: file.mimetype,
                    ContentLength: file.size
                })
            );

            // Generate and return the file URL
            // Public url https://pub-1db3dea75deb4e36a362d30e3f67bb76.r2.dev
            // Private url https://98d50eb9172903f66dfd5573801dc8b6.r2.cloudflarestorage.com
            const fileUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${process.env.CLOUDFLARE_R2_BUCKET}/${key}`;

            
            const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('name')
            .eq('id', clientId)
            .maybeSingle();
            await sendTaskMessage(fileUrl, title, description, file.mimetype, 'pdf', uesrId, clientId, workspaceId, client.name, "file", folderId)

            return {
                fileUrl
            };
        } catch (err) {
            console.log(err)
            return this.handleError(err);
        }
    }

    async addCreateLink({ title,content,category,tags,isLive,description: description,status, contentType   , folderId }, uesrId, clientId, workspaceId){
        try {
            const azureService = new AzureStorageService()
            await azureService.init()
            const url = await azureService.uploadSnippet(title, description, content)
            const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('name')
            .eq('id', clientId)
            .maybeSingle();
            await sendTaskMessage(url, title, description, content, 'url', uesrId, clientId, workspaceId, client.name, "website", folderId)
            return url
        } catch (err) {
            console.log(err)
            return this.handleError(err);
        }
    }

    async fetchContents({ clientId, workspaceId }) {
        try {
          /* ── 1. query ─────────────────────────────────────────────── */
          const { data, error } = await supabase
            .from('ingestion_events')
            .select(`
              id,
              doc_id,
              doc_title,
              doc_type,
              status,
              doc_url,
              ingested_at,
              updated_at,
              message_count,
              folder_id,
              users:user_id ( id, name, avatar ),
              ingestion_events_chatbots,
              content_type
            `)
            .eq('client_id', clientId)
            .eq('workspace_id', workspaceId);
      
          if (error) throw error;
          /* ── 2. reshape ───────────────────────────────────────────── */

          const result = (data || []).map((row) => ({
            id: row.doc_id,
            title: row.doc_title,
            description: row.doc_url || '',               // put something useful here
            status: row.status === 'success' ? 'active' : row.status,
            contentType: row.content_type,
            category: 'Documentation',                    // adjust if you have a field
            createdAt: row.ingested_at,
            lastUpdated: row.updated_at || row.ingested_at,
            folderId: row.folder_id,
            author: {
              id: row.users?.id || row.user_id,
              name: row.users?.name || 'Unknown',
              avatar: row.users?.avatar || null,
            },
            messageCount: row.message_count || 0,
            chatbots:[]
          }));
          return result
        } catch (err) {
          console.error('[fetchContents] failed:', err);
          throw err;                  // or handleError(err) if you have one
        }
      }


    async addChatbotDocument({ title, type, chatbotIds, link, content, workspaceId, clientId, createdBy }, fileInst = null) {
        try {
            if (type === 'link' && !link) {
                throw new errors.BadRequest(`Link is required for doc type: ${type}`);
            }

            let id = uuidv4();
            let filePath = null;
            let document = await this.create({ id, title, type, content, link, chatbotIds, filePath, workspaceId, clientId, createdBy });

            let metadata = { title, clientId, chatbotIds, doc_id: document.id };
            let llmInstance = new LLMServiceExternalService();

            if (type === 'content') {
                if (!content) {
                    throw new errors.BadRequest(`Content is required for doc type: ${type}`);
                }
                let fs = new BaseFileSystem();
                let fileDir = path.join(`./file-storage/${clientId}/${workspaceId}/chatbot-document/${id}/content`);
                await fs.mkdir(fileDir);
                filePath = path.join(fileDir, `${title}.txt`);
                await fs.writeFile(filePath, content);
                llmInstance.addData('text', content, metadata);
            }

            if (type === 'file') {
                if (!fileInst) {
                    throw new errors.BadRequest(`File is required for doc type: ${type}`);
                }
                let fs = new BaseFileSystem();
                let fileDir = path.join(`./file-storage/${clientId}/${workspaceId}/chatbot-document/${id}/file`);
                await fs.mkdir(fileDir);
                filePath = path.join(fileDir, fileInst.name);
                await fileInst.mv(filePath);
                llmInstance.addDocument('pdf_file', filePath, metadata);
            }

            if (filePath) {
                let inst = new ChatBotExternalService();
                let docData = { organizationId: clientId, documentId: id, documentSetId: clientId };
            } else {
                llmInstance.addData(type, link, metadata);
            }

            return document;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateChatbotDocument(chatbot_document_id, updateValues) {
        try {
            await this.update({ id: chatbot_document_id }, updateValues);
            return;
        } catch (e) {
            throw e;
        }
    }

    async deleteChatbotDocument(id) {
        try {
            return await this.softDelete(id);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async bulkAction({ action, chatbotIds, ids, workspaceId, clientId }) {
        try {
            let filters = { id: ids, workspaceId, clientId };
            let updateValues = {};

            if (action === 'archive') updateValues.archiveAt = new Date();
            if (action === 'restore') updateValues.archiveAt = null;

            if ((action === 'removeChatBots' || action === 'addChatBots') && chatbotIds) {
                let botProfileServiceInst = new this.ChatBotProfileService();
                let chatBotsCount = await botProfileServiceInst.count({ id: chatbotIds, workspaceId, clientId });
                if (chatBotsCount !== chatbotIds.length) {
                    throw new errors.BadRequest("Invalid chatbot ids");
                }
                if (action === 'removeChatBots') {
                    updateValues['$pull'] = { chatbotIds: chatbotIds };
                } else {
                    updateValues['$push'] = { chatbotIds: chatbotIds };
                }
            }

            await this.updateMany(filters, updateValues);
            return;
        } catch (error) {
            return this.handleError(error);
        }
    }

    parseFilters({ title, type, chatbotId, excludeChatbotId, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = { workspaceId, clientId };

        if (title) filters.title = { $ilike: `%${title}%` };
        if (type) filters.type = type;
        if (chatbotId) filters.chatbotIds = chatbotId;
        if (excludeChatbotId) filters.chatbotIds = { $ne: excludeChatbotId };

        if (createdFrom) filters.createdAt = { ...filters.createdAt, $gte: createdFrom };
        if (createdTo) filters.createdAt = { ...filters.createdAt, $lt: createdTo };

        return filters;
    }
}

module.exports = ChatbotDocumentService;
