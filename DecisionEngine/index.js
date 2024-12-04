const TicketService = require("../services/TicketService");
// const ConversationService = require("../services/ConversationService");
const LLMServiceExternalService = require("../ExternalService/LLMServiceExternalService");
const SocketStore = require('../Socket/Store')();
const logger = require("../logger");

class DecisionEngine {

  constructor(io, socketInst) {
    this.io = io;
    this.socketInst = socketInst;
    this.SocketStore = SocketStore;
    this.llmInst = new LLMServiceExternalService();
    // Add any required initialization logic here
  }

  async addTicketToDecisionEngine(message) {
    let llmInst = new LLMServiceExternalService();

    let res;
    try {
      // res = await new Promise((resolve, reject) => {
      //   setTimeout(() => {
      //     resolve('Hello Utkarsh! I apologize for the inconvenience you are facing. In order to assist you better, could you please provide more details about the issue you are experiencing while trying to create a user? Are you encountering any error messages or facing any specific challenges? This will help me provide you with a more accurate solution. Thank you!');
      //   }, 3000);
      // });
      res = llmInst.askQuery(message);
    } catch (error) {
      logger.error("Error while adding ticket to decision engine", error);
    }
    return res;
  }

  async extractSentimentAndIntent(message, workspaceId) {
    let llmInst = new LLMServiceExternalService();
    let intentData;
    try {
      intentData = await llmInst.getQueryIntent(message);
    } catch (error) {
      logger.error("Error while getting intent data", error);
    }
    let sentimentData;
    try {
      sentimentData = await llmInst.getQuerySentiment(message);
    } catch (error) {
      logger.error("Error while getting sentiment data", error)
    }
    return { intentData, sentimentData };
  }

  async measureAgentResponseQuality(conversationText) {
    let llmInst = new LLMServiceExternalService();
    try {
      let qaData = await llmInst.getConversationScore(conversationText);
      return qaData
    } catch (error) {
      logger.error("Error while getting qa data", {error});
      return Promise.reject(error);
    }
  }

  async decide(messageInst) {
    let message = messageInst.message;
    let { intentData, sentimentData } = await this.extractSentimentAndIntent(message);

    try {
      if (sentimentData && sentimentData.sentiments === 'negative' && sentimentData.score < 15) {
        return "Human Agent";
      }

      if (intentData.intents) {
        const requiredData = extractRequiredData(intentData.intents, message);
        if (requiredData) {
          const customerResponse = await askCustomerForData(requiredData);
          const extractedData = extractRelevantData(customerResponse);
          const assignedAgent = assignAgent(extractedData);
          if (assignedAgent) {
            return "Human Agent";
          }
        }
      }

      if (message.length > 10) {
        return "Chatbot";
      } else {
        return "Human Agent";
      }
    } catch (error) {
      console.error(error);
      throw new Error("An error occurred while processing the decision.");
    }
  }

  async askQuery(req, reply) {
    let user  = req.authUser;
    let workspaceId = req.query.workspace_id;

    let llmInst = new LLMServiceExternalService();
    return llmInst.askQuery(req.body.query);
  }

  async extractRequiredData(intentData, message) {
    // Extract required data from customer's message using intent detection
    // ...
  }

  async askCustomerForData(requiredData) {
    // If agent needs specific data, ask customer to provide it
    // ...
  }

  async extractRelevantData(customerResponse) {
    // Wait for customer's response and extract relevant data
    // ...
  }

  async assignAgent(extractedData) {
    // Assign agent based on extracted data
    // ...
  }
}

let decisionEngine;
module.exports = (io, socket) => {
  if (!decisionEngine) {
    decisionEngine = new DecisionEngine(io, socket);
  }
  return decisionEngine;
};
