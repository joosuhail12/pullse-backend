const Promise = require("bluebird");
const errors = require("../errors");
const BaseService = require("./BaseService");
const ChatBotExternalService = require("../ExternalService/ChatBotExternalService");
const _ = require("lodash");
const LLMServiceExternalService = require("../ExternalService/LLMServiceExternalService");
const supabase = require("../db/supabaseClient"); // Import Supabase client

class LLMService extends BaseService {
    constructor() {
        super();
        this.entityName = "LLMService";
        this.listingFields = ["-id"];
        this.updatableFields = [];
    }

    async uploadKbFile(fileInst) {
        try {
            let inst = new LLMServiceExternalService();
            let res = await inst.addDocument(fileInst.tempFilePath);
            return res;
        } catch (error) {
            throw new errors.Internal("Error uploading KB file.");
        }
    }

    async addAssistant(name, instruction = "You are a customer support representative. Answer queries accurately without making up responses.") {
        try {
            let inst = new LLMServiceExternalService();
            let res = await inst.addAssistant(name, instruction);
            
            const { data, error } = await supabase
                .from("assistants")
                .insert([{ name, instruction, assistant_id: res.assistant_id }]);
            
            if (error) throw error;
            return res;
        } catch (error) {
            throw new errors.Internal("Error creating LLM assistant.");
        }
    }

    async addThread(assistant_id) {
        if (!assistant_id) throw new errors.BadRequest("Invalid assistant_id.");
        try {
            let inst = new LLMServiceExternalService();
            let res = await inst.addThread(assistant_id);
            
            const { data, error } = await supabase
                .from("threads")
                .insert([{ assistant_id, thread_id: res.thread_id }]);
            
            if (error) throw error;
            return res;
        } catch (error) {
            throw new errors.Internal("Error creating thread.");
        }
    }

    async addMessage(assistant_id, thread_id, message) {
        try {
            let inst = new LLMServiceExternalService();
            let res = await inst.addMessage(assistant_id, thread_id, message);
            
            const { data, error } = await supabase
                .from("messages")
                .insert([{ assistant_id, thread_id, message, response: res.resp }]);
            
            if (error) throw error;
            return res.resp;
        } catch (error) {
            throw new errors.Internal("Error adding message.");
        }
    }

    async getMessageIntent(message) {
        try {
            let llmInst = new LLMServiceExternalService();
            let intentData = await llmInst.getQueryIntent(message);
            return intentData;
        } catch (error) {
            throw new errors.Internal("Error fetching message intent.");
        }
    }

    async getMessageSentiment(message) {
        try {
            let llmInst = new LLMServiceExternalService();
            let sentimentData = await llmInst.getQuerySentiment(message);
            return sentimentData;
        } catch (error) {
            throw new errors.Internal("Error fetching message sentiment.");
        }
    }
}

module.exports = LLMService;
