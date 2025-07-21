const { v4: uuidv4 } = require('uuid');
const errors = require("../errors");
const ChatbotDocumentUtility = require('../db/utilities/ChatBotDocumentUtility');
const ChatBotExternalService = require("../ExternalService/ChatBotExternalService");
const BaseService = require("./BaseService");
const _ = require("lodash");
const fs = require('fs');
const fsPromises = require('fs').promises;
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const FormData = require('form-data');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class ChatbotDocumentService extends BaseService {
    constructor(fields = null, dependencies = null) {
        super();
        this.utilityInst = new ChatbotDocumentUtility();
        this.ChatBotProfileService = dependencies?.ChatBotProfileService;
        this.entityName = 'ingestion_events';
        this.listingFields = ["id", "doc_title", "doc_type", "status", "created_at"];
        this.updatableFields = ["doc_title", "doc_type", "doc_url", "content", "file_data", "file_name", "file_size", "file_mime_type", "metadata"];
        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
            credentials: {
                accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
                secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
            },
        });
    }

    async addCreateSnippet({ title, content, tags, isLive, description, status, contentType, folderId, chatbots }, userId, clientId, workspaceId) {
        try {
            // Validate UUID parameters
            const validateUUID = (value, fieldName) => {
                if (!value || value === 'all' || value === 'null' || value === 'undefined') {
                    return null;
                }
                // Basic UUID validation regex
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(value)) {
                    throw new errors.BadRequest(`${fieldName} must be a valid UUID format, received: ${value}`);
                }
                return value;
            };

            // Validate required UUID fields
            const validUserId = validateUUID(userId, 'userId');
            const validClientId = validateUUID(clientId, 'clientId');
            const validWorkspaceId = validateUUID(workspaceId, 'workspaceId');
            
            // folderId can be null, but if provided must be valid UUID
            const validFolderId = folderId === 'all' ? null : validateUUID(folderId, 'folderId');
            
            // Store snippet data directly in ingestion_events table
            const documentData = {
                id: uuidv4(),
                user_id: validUserId,
                doc_title: title,
                doc_type: 'content',
                doc_url: null,
                doc_id: uuidv4(),
                status: status || 'pending',
                ingested_at: new Date().toISOString(),
                client_id: validClientId,
                workspace_id: validWorkspaceId,
                message_count: 0,
                ingestion_events_chatbots: [],
                updated_at: new Date().toISOString(),
                content_type: contentType || 'text',
                folder_id: validFolderId,
                error_msg: null,
                content: description, // Store the description as content
                file_data: null,
                file_name: null,
                file_size: null,
                file_mime_type: null,
                metadata: JSON.stringify({
                    tags,
                    isLive,
                    contentType,
                    folderId: validFolderId,
                    originalContent: content
                })
            };

            const { data, error } = await supabase
                .from('ingestion_events')
                .insert(documentData)
                .select()
                .single();

            if (error) throw error;

            // Send POST request to external ingestion service
            try {
                const ingestionData = new FormData();
                ingestionData.append('title', title);
                ingestionData.append('content', content);
                ingestionData.append('description', description);
                ingestionData.append('tags', tags || []);
                ingestionData.append('status', status || 'draft');
                ingestionData.append('contentType', contentType || 'snippet');
                ingestionData.append('folderId', validFolderId);
                ingestionData.append('user_id', validUserId);
                ingestionData.append('workspace_id', validWorkspaceId);
                ingestionData.append('original_id', data.id);
                ingestionData.append('chatbots', JSON.stringify(chatbots));
                let config = {
                    method: 'post',
                    maxBodyLength: Infinity,
                    url: 'http://localhost:8000/ingest/',
                    headers: { 
                        'x-api-key': 'letmein123', 
                        ...ingestionData.getHeaders()
                    },
                    data: ingestionData
                };

                axios.request(config)
                    .then((response) => {
                        console.log(JSON.stringify(response.data));
                    })
                    .catch((error) => {
                        console.log(error);
                    });

            } catch (ingestionError) {      
                console.log("ingestionErrorXXXXXXXXXXXXXXXXXXXXX", ingestionError)
            }


            return {
                id: data.id,
                title: data.doc_title,
                status: 'success',
                message: 'Snippet created successfully'
            };

        } catch (err) {
            return this.handleError(err);
        }
    }

    async addCreateActionCenter({ title, content, tags, isLive, description, status, contentType, folderId }, userId, clientId, workspaceId) {
        try {
            // Validate UUID parameters
            const validateUUID = (value, fieldName) => {
                if (!value || value === 'all' || value === 'null' || value === 'undefined') {
                    return null;
                }
                // Basic UUID validation regex
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(value)) {
                    throw new errors.BadRequest(`${fieldName} must be a valid UUID format, received: ${value}`);
                }
                return value;
            };

            // Validate required UUID fields
            const validUserId = validateUUID(userId, 'userId');
            const validClientId = validateUUID(clientId, 'clientId');
            const validWorkspaceId = validateUUID(workspaceId, 'workspaceId');
            
            // folderId can be null, but if provided must be valid UUID
            const validFolderId = folderId === 'all' ? null : validateUUID(folderId, 'folderId');

            // Store action center data directly in ingestion_events table
            const documentData = {
                id: uuidv4(),
                user_id: validUserId,
                doc_title: title,
                doc_type: 'content',
                doc_url: null,
                doc_id: uuidv4(),
                status: status || 'pending',
                ingested_at: new Date().toISOString(),
                client_id: validClientId,
                workspace_id: validWorkspaceId,
                message_count: 0,
                ingestion_events_chatbots: [],
                updated_at: new Date().toISOString(),
                content_type: contentType || 'text',
                folder_id: validFolderId,
                error_msg: null,
                content: description,
                file_data: null,
                file_name: null,
                file_size: null,
                file_mime_type: null,
                metadata: JSON.stringify({
                    tags,
                    isLive,
                    contentType,
                    folderId: validFolderId,
                    originalContent: content
                })
            };

            const { data, error } = await supabase
                .from('ingestion_events')
                .insert(documentData)
                .select()
                .single();

            if (error) throw error;

            return {
                id: data.id,
                title: data.doc_title,
                status: 'success',
                message: 'Action center created successfully'
            };

        } catch (err) {
            return this.handleError(err);
        }
    }

    async addCreateDocument({ title, file, tags, isLive, description, status, contentType, folderId, chatbots }, userId, clientId, workspaceId) {
        try {
            // File validation
            if (!file || !file.name || !file.size || !file.mimetype || !file.tempFilePath) {
                throw new errors.BadRequest('File object is invalid or incomplete.');
            }
    
            // Validate UUID helper
            const validateUUID = (value, fieldName) => {
                if (!value || ['all', 'null', 'undefined'].includes(value)) return null;
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(value)) {
                    throw new errors.BadRequest(`${fieldName} invalid UUID: ${value}`);
                }
                return value;
            };
    
            const validUserId = validateUUID(userId, 'userId');
            const validClientId = validateUUID(clientId, 'clientId');
            const validWorkspaceId = validateUUID(workspaceId, 'workspaceId');
            const validFolderId = folderId === 'all' ? null : validateUUID(folderId, 'folderId');
    
            // Read file data as a stream for ingestion service (matches Postman behavior)
            const fileStream = fs.createReadStream(file.tempFilePath);
    
            // Store document metadata into Supabase
            const documentData = {
                id: uuidv4(),
                user_id: validUserId,
                doc_title: title,
                doc_type: 'file',
                doc_url: null,
                doc_id: uuidv4(),
                status: status || 'pending',
                ingested_at: new Date().toISOString(),
                client_id: validClientId,
                workspace_id: validWorkspaceId,
                message_count: 0,
                ingestion_events_chatbots: [],
                updated_at: new Date().toISOString(),
                content_type: contentType || file.mimetype,
                folder_id: validFolderId,
                error_msg: null,
                content: description,
                file_data: await fsPromises.readFile(file.tempFilePath), // Still store buffer here
                file_name: file.name,
                file_size: file.size,
                file_mime_type: file.mimetype,
                metadata: JSON.stringify({ tags, isLive, contentType, folderId: validFolderId })
            };
    
            const { data, error } = await supabase
                .from('ingestion_events')
                .insert(documentData)
                .select()
                .single();
    
            if (error) throw error;
    
            // Prepare data for external ingestion service
            const ingestionData = new FormData();
            ingestionData.append('title', title || '');
            ingestionData.append('description', description || '');
            ingestionData.append('status', status || 'draft');
            ingestionData.append('contentType', contentType || 'document');
            ingestionData.append('original_id', data.id);
            ingestionData.append('chatbots', JSON.stringify(chatbots));
            // add tags (optional)
            (tags || []).forEach(tag => ingestionData.append('tags[]', tag));

            // append file correctly
            ingestionData.append('file', fileStream, {
                filename: file.name,
                contentType: file.mimetype
            });

            // ✅ FIX: Only append UUID params if valid
            if(validFolderId) ingestionData.append('folderId', validFolderId);
            if(validUserId) ingestionData.append('user_id', validUserId);
            if(validWorkspaceId) ingestionData.append('workspace_id', validWorkspaceId);

            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'http://localhost:8000/ingest/',
                headers: { 
                    'x-api-key': 'letmein123', 
                    'Authorization': 'Bearer 3cfad8ef-7853-436b-86ca-f540ac07fdfc', 
                    ...ingestionData.getHeaders()
                },
                data: ingestionData
            };

            try {
                const response = await axios.request(config);
                console.log('Ingestion service success:', response.data);
            } catch (error) {
                console.error('Ingestion service error:', error.response.data);
            }
    
            return {
                id: data.id,
                title: data.doc_title,
                fileName: data.file_name,
                fileSize: data.file_size,
                status: 'success',
                message: 'Document uploaded successfully'
            };
    
        } catch (err) {
            console.error('Error:', err);
            return this.handleError(err);
        }
    }
    

    async addCreateLink({ title, content, tags, isLive, description, status, contentType, folderId, chatbots }, userId, clientId, workspaceId) {
        try {
            // Validate UUID parameters
            const validateUUID = (value, fieldName) => {
                if (!value || value === 'all' || value === 'null' || value === 'undefined') {
                    return null;
                }
                // Basic UUID validation regex
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(value)) {
                    throw new errors.BadRequest(`${fieldName} must be a valid UUID format, received: ${value}`);
                }
                return value;
            };

            // Validate required UUID fields
            const validUserId = validateUUID(userId, 'userId');
            const validClientId = validateUUID(clientId, 'clientId');
            const validWorkspaceId = validateUUID(workspaceId, 'workspaceId');
            
            // folderId can be null, but if provided must be valid UUID
            const validFolderId = folderId === 'all' ? null : validateUUID(folderId, 'folderId');
            // Store link data directly in ingestion_events table
            const documentData = {
                id: uuidv4(),
                user_id: validUserId,
                doc_title: title,
                doc_type: 'link',
                doc_url: content, // Store the URL as doc_url
                doc_id: uuidv4(),
                status: status || 'pending',
                ingested_at: new Date().toISOString(),
                client_id: validClientId,
                workspace_id: validWorkspaceId,
                message_count: 0,
                ingestion_events_chatbots: [],
                updated_at: new Date().toISOString(),
                content_type: contentType || 'url',
                folder_id: validFolderId,
                error_msg: null,
                content: description, // Store description as content
                file_data: null,
                file_name: null,
                file_size: null,
                file_mime_type: null,
                metadata: JSON.stringify({
                    tags,
                    isLive,
                    contentType,
                    folderId: validFolderId
                })
            };

            const { data, error } = await supabase
                .from('ingestion_events')
                .insert(documentData)
                .select()
                .single();

            if (error) throw error;
            if(chatbots){
                chatbots.forEach(async chatbot => {
                    try{
                    await supabase
                        .from('chatbotdocuments')
                        .insert({
                            document_id: data.id,
                            chatbot_ids: chatbot,
                            workspace_id: validWorkspaceId,
                            client_id: validClientId,
                            created_by: validUserId,
                        });
                    }catch(e){
                        console.log("ChatbotDocumentService addCreateLink error", e)
                    }
                });
            }
            // Send POST request to external ingestion service
            try {
                let ingestionData = new FormData();
                ingestionData.append('url', content);
                ingestionData.append('title', title);
                ingestionData.append('description', description);
                ingestionData.append('user_id', validUserId);
                ingestionData.append('workspace_id', validWorkspaceId);
                ingestionData.append('original_id', data.id);
                ingestionData.append('chatbots', JSON.stringify(chatbots));

                let config = {
                    method: 'post',
                    maxBodyLength: Infinity,
                    url: 'http://localhost:8000/ingest/',
                    headers: { 
                        'x-api-key': 'letmein123', 
                        ...ingestionData.getHeaders()
                    },
                    data: ingestionData
                };

                axios.request(config)
                    .then((response) => {
                        console.log(JSON.stringify(response.data));
                    })
                    .catch((error) => {
                        console.log(error);
                    });

            } catch (ingestionError) {
                console.error('Failed to send data to ingestion service:', ingestionError.message);
            }

            return {
                id: data.id,
                title: data.doc_title,
                link: data.doc_url,
                status: 'success',
                message: 'Link created successfully'
            };

        } catch (err) {
            return this.handleError(err);
        }
    }

    async fetchContents({ clientId, workspaceId }) {
        try {
            // Validate UUID parameters
            const validateUUID = (value, fieldName) => {
                if (!value || value === 'all' || value === 'null' || value === 'undefined') {
                    return null;
                }
                // Basic UUID validation regex
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(value)) {
                    throw new errors.BadRequest(`${fieldName} must be a valid UUID format, received: ${value}`);
                }
                return value;
            };

            // Validate required UUID fields
            const validClientId = validateUUID(clientId, 'clientId');
            const validWorkspaceId = validateUUID(workspaceId, 'workspaceId');

            // Query ingestion_events table
            const { data, error } = await supabase
                .from('ingestion_events')
                .select(`
                    id,
                    doc_title,
                    doc_type,
                    status,
                    doc_url,
                    content,
                    file_name,
                    file_size,
                    file_mime_type,
                    metadata,
                    ingested_at,
                    updated_at,
                    user_id,
                    users:user_id (id, name, avatar)
                `)
                .eq('client_id', validClientId)
                .eq('workspace_id', validWorkspaceId);

            if (error) throw error;

            const result = (data || []).map((row) => ({
                id: row.id,
                title: row.doc_title,
                description: row.content || row.doc_url || '',
                status: row.status === 'success' ? 'active' : row.status,
                contentType: row.doc_type === 'content' ? 'snippet' : row.doc_type === 'link' ? 'website' : row.doc_type,
                createdAt: row.ingested_at,
                lastUpdated: row.updated_at || row.ingested_at,
                folderId: row.metadata ? JSON.parse(row.metadata).folderId : null,
                author: {
                    id: row.users?.id || row.user_id,
                    name: row.users?.name || 'Unknown',
                    avatar: row.users?.avatar || null,
                },
                messageCount: 0, // This would need to be calculated from related tables
                chatbots: [],
                fileInfo: row.doc_type === 'file' ? {
                    fileName: row.file_name,
                    fileSize: row.file_size,
                    mimeType: row.file_mime_type
                } : null
            }));

            return result;
        } catch (err) {
            console.error('[fetchContents] failed:', err);
            throw err;
        }
    }

    async addChatbotDocument({ title, type, chatbotIds, link, content, workspaceId, clientId, createdBy }, fileInst = null) {
        try {
            if (type === 'link' && !link) {
                throw new errors.BadRequest(`Link is required for doc type: ${type}`);
            }

            // Validate UUID parameters
            const validateUUID = (value, fieldName) => {
                if (!value || value === 'all' || value === 'null' || value === 'undefined') {
                    return null;
                }
                // Basic UUID validation regex
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(value)) {
                    throw new errors.BadRequest(`${fieldName} must be a valid UUID format, received: ${value}`);
                }
                return value;
            };

            // Validate required UUID fields
            const validCreatedBy = validateUUID(createdBy, 'createdBy');
            const validClientId = validateUUID(clientId, 'clientId');
            const validWorkspaceId = validateUUID(workspaceId, 'workspaceId');

            let id = uuidv4();
            let documentData = {
                id: uuidv4(),
                user_id: validCreatedBy,
                doc_title: title,
                doc_type: type,
                doc_url: type === 'link' ? link : null,
                doc_id: id,
                status: 'pending',
                ingested_at: new Date().toISOString(),
                client_id: validClientId,
                workspace_id: validWorkspaceId,
                message_count: 0,
                ingestion_events_chatbots: chatbotIds || [],
                updated_at: new Date().toISOString(),
                content_type: type,
                folder_id: null,
                error_msg: null
            };

            if (type === 'content') {
                if (!content) {
                    throw new errors.BadRequest(`Content is required for doc type: ${type}`);
                }
                documentData.content = content;
                documentData.metadata = JSON.stringify({ doc_id: id });
            }

            if (type === 'file') {
                if (!fileInst) {
                    throw new errors.BadRequest(`File is required for doc type: ${type}`);
                }
                const fileBuffer = await fsPromises.readFile(fileInst.tempFilePath);
                documentData.file_data = fileBuffer;
                documentData.file_name = fileInst.name;
                documentData.file_size = fileInst.size;
                documentData.file_mime_type = fileInst.mimetype;
                documentData.metadata = JSON.stringify({ doc_id: id });
            }

            if (type === 'link') {
                documentData.metadata = JSON.stringify({ doc_id: id });
            }

            const { data, error } = await supabase
                .from('ingestion_events')
                .insert(documentData)
                .select()
                .single();

            if (error) throw error;

            return data;
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
            // Validate UUID parameters
            const validateUUID = (value, fieldName) => {
                if (!value || value === 'all' || value === 'null' || value === 'undefined') {
                    return null;
                }
                // Basic UUID validation regex
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(value)) {
                    throw new errors.BadRequest(`${fieldName} must be a valid UUID format, received: ${value}`);
                }
                return value;
            };

            // Validate required UUID fields
            const validWorkspaceId = validateUUID(workspaceId, 'workspaceId');
            const validClientId = validateUUID(clientId, 'clientId');

            let filters = { id: ids, workspace_id: validWorkspaceId, client_id: validClientId };
            let updateValues = {};

            if (action === 'archive') updateValues.status = 'archived';
            if (action === 'restore') updateValues.status = 'pending';

            if ((action === 'removeChatBots' || action === 'addChatBots') && chatbotIds) {
                let botProfileServiceInst = new this.ChatBotProfileService();
                let chatBotsCount = await botProfileServiceInst.count({ id: chatbotIds, workspaceId: validWorkspaceId, clientId: validClientId });
                if (chatBotsCount !== chatbotIds.length) {
                    throw new errors.BadRequest("Invalid chatbot ids");
                }
                if (action === 'removeChatBots') {
                    updateValues['$pull'] = { ingestion_events_chatbots: chatbotIds };
                } else {
                    updateValues['$push'] = { ingestion_events_chatbots: chatbotIds };
                }
            }

            await this.updateMany(filters, updateValues);
            return;
        } catch (error) {
            return this.handleError(error);
        }
    }

    parseFilters({ title, type, chatbotId, excludeChatbotId, createdFrom, createdTo, workspaceId, clientId }) {
        // Validate UUID parameters
        const validateUUID = (value, fieldName) => {
            if (!value || value === 'all' || value === 'null' || value === 'undefined') {
                return null;
            }
            // Basic UUID validation regex
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(value)) {
                throw new errors.BadRequest(`${fieldName} must be a valid UUID format, received: ${value}`);
            }
            return value;
        };

        // Validate required UUID fields
        const validWorkspaceId = validateUUID(workspaceId, 'workspaceId');
        const validClientId = validateUUID(clientId, 'clientId');

        let filters = { workspace_id: validWorkspaceId, client_id: validClientId };

        if (title) filters.doc_title = { $ilike: `%${title}%` };
        if (type) filters.doc_type = type;
        if (chatbotId) filters.ingestion_events_chatbots = chatbotId;
        if (excludeChatbotId) filters.ingestion_events_chatbots = { $ne: excludeChatbotId };

        if (createdFrom) filters.ingested_at = { ...filters.ingested_at, $gte: createdFrom };
        if (createdTo) filters.ingested_at = { ...filters.ingested_at, $lt: createdTo };

        return filters;
    }
}

module.exports = ChatbotDocumentService;