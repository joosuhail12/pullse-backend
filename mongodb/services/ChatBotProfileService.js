const _ = require("lodash");
const Promise = require("bluebird");
const errors = require("../errors");
const ChatBotUtility = require('../db/utilities/ChatBotUtility');
const BaseService = require("./BaseService");
const WorkflowRuleService = require("./WorkflowRuleService");
const LLMService = require("./LLMService");
const ChatbotDocumentService = require("./ChatbotDocumentService");
const ChatBotExternalService = require("../ExternalService/ChatBotExternalService");

class ChatBotProfileService extends BaseService {

    constructor() {
        super();
        this.entityName = 'ChatBot Profile';
        this.utilityInst = new ChatBotUtility();
        this.listingFields = [ "id", "name", "status", "channels", "audience", "answerMode", "afterAnswer", "ifCantAnswer", "assistantId", "-_id"];
        this.updatableFields = ["name", "status", "channels", "audience", "rules", "introMessages", "handoverMessages", "answerMode", "afterAnswer", "ifCantAnswer", "ruleIds"];
    }

    async createBotProfile({ name, status, channels, audience, rules, introMessages, handoverMessages, answerMode, afterAnswer, ifCantAnswer, workspaceId, clientId, createdBy, }) {
        try {
            let botProfile = await this.findOne({ name: { $regex : `^${name}$`, $options: "i" }, workspaceId, clientId });
            if (!_.isEmpty(botProfile)) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${name}" already exist.`));
            }
            botProfile = { name, status, channels, audience, introMessages, handoverMessages, answerMode, afterAnswer, ifCantAnswer, workspaceId, clientId, createdBy };

            /*
            * Rules Validation
            */
            if (!_.isEmpty(rules)) {
                let ruleInst = new WorkflowRuleService();
                let { ruleIds, error: ruleErrors } = await ruleInst.createOrUpdateRules(rules, createdBy, workspaceId, clientId);
                if (!_.isEmpty(ruleErrors)) {
                    return Promise.reject(new errors.BadRequest("Error in rules.", {entity: "rules", error: ruleErrors }));
                }
                if (_.isEmpty(ruleIds)) {
                    return Promise.reject(new errors.BadRequest("No rules found.", { entity: "rules", error: ruleErrors } ));
                }
                botProfile.ruleIds = ruleIds;
            }

            let llmInst = new LLMService();
            let { assistant_id, thread_id } = await llmInst.addAssistant(name);
            botProfile.assistantId = assistant_id;
            return this.create(botProfile)
            .catch(err => {
                if (err instanceof errors.Conflict) {
                    return new errors.Conflict("Bot Profile already exist.");
                }
                return Promise.reject(err);
            });
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId, populate=false) {
        try {
            let chatbotProfile = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(chatbotProfile)) {
                return Promise.reject(new errors.NotFound(this.entityName + " not found."));
            }
            if (!populate) {
                return chatbotProfile;
            }
            let chatbotProfiles = await this.utilityInst.populate('rules', [chatbotProfile]);
            return chatbotProfiles[0];
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateChatbotProfile({ id, workspaceId, clientId }, updateValues) {
        try {

            let chatbotProfile = await this.getDetails(id, workspaceId, clientId);
            if (updateValues.name) {
                let botProfile = await this.findOne({ id: { $ne: id }, name: { $regex : `^${updateValues.name}$`, $options: "i" }, workspaceId, clientId });
                if (!_.isEmpty(botProfile)) {
                    return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${updateValues.name}" already exist.`));
                }
            }

            /*
            * Rules Validation
            */
            if (!_.isEmpty(updateValues.rules)) {
                let ruleInst = new WorkflowRuleService();
                let { ruleIds, error: ruleErrors } = await ruleInst.createOrUpdateRules(updateValues.rules, chatbotProfile.createdBy, workspaceId, clientId);
                if (!_.isEmpty(ruleErrors)) {
                    return Promise.reject(new errors.BadRequest("Error in rules.", {entity: "rules", error: ruleErrors }));
                }
                if (_.isEmpty(ruleIds)) {
                    return Promise.reject(new errors.BadRequest("No rules found.", { entity: "rules", error: ruleErrors } ));
                }
                updateValues.ruleIds = ruleIds;
                delete updateValues.rules;
            }

            await this.update({ id: chatbotProfile.id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }

    async deleteChatbotProfile({ id, workspaceId, clientId }) {
        try {
            let chatBotProfile = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(chatBotProfile.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, status, channel, audience, answerMode, afterAnswer, ifCantAnswer, workspaceId, clientId, createdFrom, createdTo }) {
        let filters = {}
        filters.clientId = clientId;
        filters.workspaceId = workspaceId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
        }
        if (status) {
            filters.status = status;
        }
        if (channel) {
            filters.channels = channel;
        }
        if (audience) {
            filters.audience = audience;
        }
        if (answerMode) {
            filters.answerMode = answerMode;
        }

        if (afterAnswer) {
            filters.afterAnswer = afterAnswer;
        }

        if (ifCantAnswer) {
            filters.ifCantAnswer = ifCantAnswer;
        }

        if (createdFrom) {
            if (!moment(createdFrom, moment.ISO_8601, true).isValid()) {
                return Promise.reject(new errors.BadRequest("Invalid created from date format."));
            }
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$gte'] = new Date(createdFrom);
        }
        if (createdTo) {
            if (!moment(createdTo, moment.ISO_8601, true).isValid()) {
                return Promise.reject(new errors.BadRequest("Invalid created to date format."));
            }
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$lt'] = new Date(createdTo);
        }
        return filters;
    }


    async getAnswerFromBot({ id, workspaceId, clientId }, query) {
        try {
            let bot = await this.getDetails(id, workspaceId, clientId);
            let botDocsInst = new ChatbotDocumentService();
            let botDocs = await botDocsInst.paginate({ chatbotId: bot.id, workspaceId, clientId }, false);
            // if (!botDocs.length) {
            //     return new errors.BadRequest("No documents linked with this bot.");
            // }
            let externalBotInst = new ChatBotExternalService();
            let docSetId = clientId;
            let answer = await externalBotInst.sendQuestion(docSetId, query, clientId);
            return answer;
        } catch(err) {
            return this.handleError(err);
        }
    }

}

module.exports = ChatBotProfileService;
