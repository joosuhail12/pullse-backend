const Promise = require("bluebird");
const errors = require("../errors");
const BaseService = require("./BaseService");
const ChatBotExternalService = require("../ExternalService/ChatBotExternalService");
const _ = require("lodash");
const LLMServiceExternalService = require("../ExternalService/LLMServiceExternalService");

class LLMService extends BaseService {

    constructor() {
        super();
        this.entityName = 'LLMService';
        this.listingFields = ["-_id"];
        this.updatableFields = [];
    }

    async uploadKbFile(fileInst) {
        // var fileBuffer = req.raw.files['my-file'].data;
        // fileBuffer.name = req.raw.files['my-file'].name;
        /*
        {
            name: 'Phonefieldoverview_WebflowUniversity.txt',
            data: <Buffer >,
            size: 10668,
            encoding: '7bit',
            tempFilePath: 'D:\\projects\\pullse\\auth\\tmp\\tmp-1-1697186791847',
            truncated: false,
            mimetype: 'text/plain',
            md5: '811b65a2d6defaf208d29f451af37382',
            mv: [Function: mv]
        }
        */

        let inst = new LLMServiceExternalService();
        let res = await inst.addDocument(fileInst.tempFilePath);
        // console.log({res});
        return res;
    }

    async addAssistant(name, instruction="You are a customer support representative for a leading company. You task is to answer customer queries. If you don't know the answer, just say that you don't know, don't try to make up an answer.") {
        try {
            let inst = new LLMServiceExternalService();
            let res = await inst.addAssistant(name, instruction);
            return res;
        } catch (error) {
            throw new Error("Something went wrong while creating LLM Agent.")
        }
    }

    async addThread(assistant_id) {
        if (!assistant_id) {
            return new Error("Invalid assistant_id.", assistant_id);
        }
        try {
            let inst = new LLMServiceExternalService();
            let res = await inst.addThread(assistant_id);
            return res;
        } catch (error) {
            throw new Error("Something went wrong while creating thread.")
        }
    }

    async addMessage(assistant_id, thread_id, message) {
        try {
            let inst = new LLMServiceExternalService();
            let res = await inst.addMessage(assistant_id, thread_id, message)
            return res.resp;
        } catch (error) {
            console.error(error);
            throw new Error("Something went wrong while adding message.")
        }
    }

    async getMessageIntent(message) {
        try {
            let llmInst = new LLMServiceExternalService();
            let intentData = await llmInst.getQueryIntent(message);
            return intentData;
        } catch (error) {
            console.error("Error while getting intent data", error);
            return this.handleError(error);
        }
    }

    async getMessageSentiment(message) {
        try {
            let llmInst = new LLMServiceExternalService();
            let sentimentData = await llmInst.getQuerySentiment(message);
            return sentimentData;
        } catch (error) {
            console.error("Error while getting sentiment data", error);
            return this.handleError(error);
        }
    }

}

module.exports = LLMService;

