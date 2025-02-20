const _ = require("lodash");
const Promise = require("bluebird");
const errors = require("../errors");
const ChatBotUtility = require('../db/utilities/ChatBotUtility');
const BaseService = require("./BaseService");
const WorkflowRuleService = require("./WorkflowRuleService");
const LLMService = require("./LLMService");
const ChatbotDocumentService = require("./ChatbotDocumentService");
const ChatBotExternalService = require("../ExternalService/ChatBotExternalService");
const supabase = require("../db/supabaseClient");

class ChatBotProfileService extends BaseService {
    constructor() {
        super();
        this.entityName = 'ChatBot Profile';
        this.utilityInst = new ChatBotUtility();
        this.listingFields = ["id", "name", "status", "channels", "audience", "answerMode", "afterAnswer", "ifCantAnswer", "assistantId"];
        this.updatableFields = ["name", "status", "channels", "audience", "rules", "introMessages", "handoverMessages", "answerMode", "afterAnswer", "ifCantAnswer", "ruleIds"];
    }

    async createBotProfile({ name, status, channels, audience, rules, introMessages, handoverMessages, answerMode, afterAnswer, ifCantAnswer, workspaceId, clientId, createdBy }) {
        try {
            const { data: botProfile, error } = await supabase
                .from('chatbot')
                .select('id')
                .eq('name', name)
                .eq('workspace_id', workspaceId)
                .eq('client_id', clientId)
                .single();

            if (botProfile) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${name}" already exists.`));
            }

            let botData = { name, status, channels, audience, introMessages, handoverMessages, answerMode, afterAnswer, ifCantAnswer, workspace_id: workspaceId, client_id: clientId, created_by: createdBy };

            if (!_.isEmpty(rules)) {
                let ruleInst = new WorkflowRuleService();
                let { ruleIds, error: ruleErrors } = await ruleInst.createOrUpdateRules(rules, createdBy, workspaceId, clientId);
                if (!_.isEmpty(ruleErrors)) {
                    return Promise.reject(new errors.BadRequest("Error in rules.", { entity: "rules", error: ruleErrors }));
                }
                botData.rule_ids = ruleIds;
            }

            let llmInst = new LLMService();
            let { assistant_id } = await llmInst.addAssistant(name);
            botData.assistant_id = assistant_id;

            const { data, error: insertError } = await supabase.from('chatbot').insert([botData]).select();
            if (insertError) throw insertError;
            return data[0];
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            const { data: chatbotProfile, error } = await supabase
                .from('chatbot')
                .select('*')
                .eq('id', id)
                .eq('workspace_id', workspaceId)
                .eq('client_id', clientId)
                .single();

            if (!chatbotProfile) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }
            return chatbotProfile;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateChatbotProfile({ id, workspaceId, clientId }, updateValues) {
        try {
            let chatbotProfile = await this.getDetails(id, workspaceId, clientId);
            if (updateValues.name) {
                const { data: botProfile } = await supabase
                    .from('chatbot')
                    .select('id')
                    .eq('name', updateValues.name)
                    .eq('workspace_id', workspaceId)
                    .eq('client_id', clientId)
                    .neq('id', id)
                    .single();

                if (botProfile) {
                    return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${updateValues.name}" already exists.`));
                }
            }

            const { error } = await supabase
                .from('chatbot')
                .update(updateValues)
                .eq('id', id);

            if (error) throw error;
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteChatbotProfile({ id, workspaceId, clientId }) {
        try {
            await this.getDetails(id, workspaceId, clientId);
            const { error } = await supabase
                .from('chatbot')
                .update({ deleted_at: new Date() })
                .eq('id', id);

            if (error) throw error;
            return Promise.resolve();
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getAnswerFromBot({ id, workspaceId, clientId }, query) {
        try {
            await this.getDetails(id, workspaceId, clientId);
            let externalBotInst = new ChatBotExternalService();
            let answer = await externalBotInst.sendQuestion(clientId, query, clientId);
            return answer;
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = ChatBotProfileService;
