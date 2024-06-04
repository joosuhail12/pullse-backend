const _ = require("lodash");
const Promise = require("bluebird");
const ConversationUtility = require('../db/utilities/ConversationUtility');
const BaseService = require("./BaseService");
const TicketService = require("./TicketService");
const LLMService = require("./LLMService");
const errors = require("../errors");
const { UserType } = require('../constants/ClientConstants');
const { Status: TicketStatus, EntityType, MessageType } = require('../constants/TicketConstants');
const Socket = require('../Socket');
const DecisionEngine = require('../DecisionEngine');
const EventConstants = require("../Socket/EventConstants");
const ConversationEventPublisher = require("../Events/ConversationEvent/ConversationEventPublisher");

class ConversationService extends BaseService {

    constructor() {
        super();
        this.entityName = "Conversation";
        this.utilityInst = new ConversationUtility();
        this.listingFields = [ "id", "message", "type", "userType", "createdBy", "createdAt", "updatedAt", "-_id" ];
        this.updatableFields = [ "message", ];
        this.ticketInst = new TicketService();
    }

    /**
     * This function is used to add message to ticket conversation
     * @param {object} data
     * @param {string} data.ticketId
     * @param {string} data.message
     * @param {string} data.type
     * @param {string} data.userType
     * @param {string} data.createdBy
     * @param {string} data.workspaceId
     * @param {string} data.clientId
     * @param {object} newTicket
     * @returns {Promise}
     * */
    async addMessage({ ticketId, message, type, userType, tagIds, mentionIds, createdBy, workspaceId, clientId }, newTicket=false) {
        try {
            let ticket;
            if (newTicket) {
                if (!message) {
                    return Promise.reject(new errors.BadRequest("Message is required."));
                }
                let data = {
                    title: newTicket.title || 'New Ticket',
                    description: newTicket.description,
                    ticketCreatedBy: newTicket.ticketCreatedBy,
                    customerId: newTicket.customerId,
                    channel: newTicket.channel || null,
                    sessionId: newTicket.sessionId || null,
                    device: newTicket.device,
                    clientId,
                    createdBy,
                    workspaceId,
                    entityType: EntityType.conversation,
                    lastMessage: message,
                    lastMessageBy: UserType.customer,
                    lastMessageAt: new Date(),
                };
                ticket = await this.ticketInst.createTicket(data);
            } else {
                ticket = await this.ticketInst.findOne({ id: ticketId });
                let ticketUpdate = {}
                if (mentionIds) {
                    ticketUpdate = {
                        $addToSet: {
                        mentionIds: { $each: mentionIds }
                        }
                    };
                }
                if (tagIds) {
                    ticketUpdate = {
                        $addToSet: {
                        tagIds: { $each: tagIds }
                        }
                    };
                }
                ticketUpdate.lastMessage = message;
                ticketUpdate.lastMessageAt = new Date();
                if (userType == ticket.lastMessageBy) {
                    ticketUpdate['$inc'] = { 'unread': 1 };
                } else {
                    ticketUpdate.lastMessageBy = userType;
                    ticketUpdate.unread = 1;
                }
                await this.ticketInst.updateOne({ id: ticket.id }, ticketUpdate);
            }
            if (!ticket) {
                return Promise.reject(new errors.NotFound("Ticket not found."));
            }
            let messageData = { ticketId: ticket.id, message, type, userType, createdBy, workspaceId, clientId }
            if ([ MessageType.note, MessageType.summary, MessageType.qa ].includes(type)) {
                messageData.visibleTo = UserType.agent;
            }
            let msg = await this.create(messageData);
            let conversationMessage = await this.findOne({ id: msg.id });
            let inst = new ConversationEventPublisher();
            await inst.created(conversationMessage, ticket, !!newTicket);
            return {
                conversationMessage,
                ticket,
            };
        } catch(err) {
            return this.handleError(err);
        }
    }

    /**
     * Extract Sentiment and Intent from a message
     * @param {object} conversationMessage
     * @param {object} ticket
     * @returns {Promise}
     * */
    async setTicketSentimentAndIntents(conversationMessage, ticket = null) {
        let intentData = null, sentimentData = null;
        let llmInst = new LLMService();
        let toUpdate = {};

        try {
            intentData = await llmInst.getMessageIntent(conversationMessage.message);
            if (intentData && intentData.intents) {
                toUpdate.intents = intentData.intents;
            }
        } catch (error) {
            console.error(error);
        }

        try {
            sentimentData = await llmInst.getMessageSentiment(conversationMessage.message);
            if (sentimentData && sentimentData.sentiments) {
                toUpdate.sentiment = { text: sentimentData.sentiments, score: sentimentData.score };
            }
        } catch (error) {
            console.error(error);
        }

        if (ticket && !_.isEmpty(toUpdate)) {
            await this.ticketInst.updateOne({ id: ticket.id }, toUpdate);
        }
        return Promise.resolve({ intentData, sentimentData });
    }

    /**
     * Do QA on tone, language and empathy for a ticket conversation
     * @param {object} ticket
     * @returns {Promise}
     * */
    async conversationQA(ticket) {
        try {
            // check if company has enabled ticket conversation QA
            let conversationText = await this.getAllMessageOfConversation(ticket.id);
            let decisionEngine = DecisionEngine();
            // let { intentData, sentimentData } = await decisionEngine.extractSentimentAndIntent(conversationText);
            let qaData = await decisionEngine.measureAgentResponseQuality(conversationText);
            let qa = { count: 1, lastAt: new Date(), language: qaData.language, tone: qaData.tone, empathy: qaData.empathy, feedback: qaData.feedback };

            let message = `
            <span class="messageCom">
                <p>
                    <center>
                        <strong>QA:</strong>
                    </center>
                </p>
                <hr>

                <p>
                    <center>
                        <u><strong>Ratings:</strong></u>
                    </center>
                </p>
                <p><strong>Language:</strong> ${qaData.language}</p>
                <p><strong>Tone:</strong> ${qaData.empathy} </p>
                <p><strong>Empathy:</strong> ${qaData.empathy} </p>
                <hr>
                <p><strong>Feedback:</strong> <em> ${qaData.feedback} </em></p>
            </span>`;
            await this.addMessage({ ticketId: ticket.id, message, type: MessageType.qa, userType: UserType.chatbot, createdBy: UserType.chatbot, workspaceId: ticket.workspaceId, clientId: ticket.clientId });
            if (ticket.qa) {
                qa.count = ticket.qa.count + 1;
            }
            await this.ticketInst.updateOne({ id: ticket.id }, { qa });
        } catch (error) {
            return this.handleError(error);
        }
    }

    async addChatBotResponse(ticket, conversationMessage, chatbotProfile, thread=null) {
        /**
         * get or create a thread for this ticket decisionEngine.llmInst.addThread
         * and message and send response decisionEngine.llmInst.addMessage
         * store thread id and message in db
        */
        try {
            let llmServiceInst = new LLMService();

            let threadId = ticket.threadId, chatbotId = chatbotProfile.id;
            if (!ticket.threadId) {
                let thread = await llmServiceInst.addThread(chatbotProfile.assistantId);
                threadId = thread.thread_id;
                let ticketServiceInst = new TicketService();
                let toUpdate = { chatbotId, threadId, assigneeTo: UserType.chatbot };
                await ticketServiceInst.updateTicket(_.pick(ticket, ['sno', 'workspaceId', 'clientId']), toUpdate)
            }

            let respMessage = await llmServiceInst.addMessage(chatbotProfile.assistantId, threadId, conversationMessage.message);
            // console.log(respMessage);
            // let addThread
            // addMessage
            let decisionEngine = DecisionEngine();
            // let respMessage = await decisionEngine.addTicketToDecisionEngine(conversationMessage.message);
            // console.log({ ticketId: ticket.id, message: respMessage, type: MessageType.text, userType: UserType.chatbot, createdBy: UserType.chatbot, workspaceId: ticket.workspaceId, clientId: ticket.clientId });
            await this.addMessage({ ticketId: ticket.id, message: respMessage, type: MessageType.text, userType: UserType.chatbot, createdBy: UserType.chatbot, workspaceId: ticket.workspaceId, clientId: ticket.clientId });
            return respMessage;
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Get all messages of a conversation in string or array format
     * @param {string} ticketId
     * @param {string} returnType
     * @returns {string|array}
     * */
    async getAllMessageOfConversation(ticketId, returnType="string") {
        try {
            let conditions = { ticketId: ticketId, type: MessageType.text };
            let conversation = await this.search(conditions, ["message", "userType"], {}, false);
            if (returnType === "array") {
                return conversation;
            }
            let conversationText = "";
            conversation.forEach((messageInst) => {
                conversationText += `${messageInst.userType}:${messageInst.message}\n`;
            });
            return conversationText;
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * As per this function filters will be used in pagination
     * @param {string} ticketId
     * @param {string} returnType
     * @returns {string|array}
     * */
    parseFilters({ ticketId, workspaceId, clientId }) {
        return { ticketId, workspaceId, clientId };
    }

    /**
     * Get conversation messages with pagination
     * @param {string} ticketId
     * @param {string} returnType
     * @returns {string|array}
     * */
    async getConversation(ticketSno, workspaceId, clientId, OtherFilters = {}, user=null) {
        try {
            let ticket = await this.ticketInst.getDetails(ticketSno, workspaceId, clientId);
            if (!ticket) {
                return Promise.reject(new errors.NotFound("Ticket not found."));
            }
            if (user && user.type === UserType.customer) {
                if (ticket.customerId !== user.id) {
                    return Promise.reject(new errors.PermissionDenied("You are not allowed to access this ticket."));
                }
            }

            // to check if have have access fetch conversation on this ticket

            let ticketId = ticket.id;
            return this.paginate({ ...OtherFilters, ticketId, workspaceId, clientId, });
        }  catch(err) {
            return this.handleError(err);
        }
    }

    /**
     * Get all attributes of a message
     * @param {string} ticketId
     * @param {string} returnType
     * @returns {string|array}
     * */
    async getMessage(id, ticketId, workspaceId, clientId) {
        try {
            let message = await this.findOne({ id, ticketId, workspaceId, clientId });
            if (_.isEmpty(message)) {
                return Promise.reject(new errors.NotFound("Message not found."));
            }
            return message;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    /**
     * Find a message by id, if message sent by(createdBy) the user
     * @param {string} id
     * @param {string} ticketId
     * @param {string} workspaceId
     * @param {string} clientId
     * @param {string} createdBy
     * @returns {message}
     * */
    async _getUserMessage(id, ticketId, workspaceId, clientId, createdBy) {
        try {
            let message = await this.findOne({ id, ticketId, workspaceId, clientId, createdBy });
            if (_.isEmpty(message)) {
                return Promise.reject(new errors.NotFound("Message not found."));
            }
            return message;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    /**
     * Update message if message sent by(createdBy) the user
     * @param {string} id
     * @param {string} ticketId
     * @param {string} workspaceId
     * @param {string} clientId
     * @param {string} createdBy
     * @param {object} updateValues
     * @returns {Promise}
     * */
    async updateMessage({ id, ticketId, workspaceId, clientId, createdBy }, updateValues) {
        try {
            let message = await this._getUserMessage(id, ticketId, workspaceId, clientId, createdBy);
            await this.update({ id: message.id }, updateValues);
            return Promise.resolve();
        } catch(err) {
            return this.handleError(err);
        }
    }

    /**
     * Delete message if message sent by(createdBy) the user
     * @param {string} id
     * @param {string} ticketId
     * @param {string} workspaceId
     * @param {string} clientId
     * @param {string} createdBy
     * @returns {Promise}
     * */
    async deleteMessage({ id, ticketId, workspaceId, clientId, createdBy }) {
        try {
            let message = await this._getUserMessage(id, ticketId, workspaceId, clientId, createdBy);
            let res = await this.softDelete(message.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

};

module.exports = ConversationService;
