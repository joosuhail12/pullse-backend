const _ = require("lodash");
const { events: EVENTS, queue } = require('./config');
const { EventConsumer } = require('../Event');
const EventConstants = require("../../Socket/EventConstants");;
const ConversationService = require("../../services/ConversationService");;
const UserService = require("../../services/UserService");;
const ChatBotProfileService = require("../../services/ChatBotProfileService");;
const CustomerService = require("../../services/CustomerService");;
const { UserType } = require('../../constants/ClientConstants');
const { MessageType } = require('../../constants/TicketConstants');
const { WorkflowEventPublisher } = require('../WorkflowEvent');

class ConversationEventConsumer extends EventConsumer {
  constructor(SocketClient) {
    super();
    this.queue = queue;
    this.SocketClient = SocketClient;
    this.EventHandlers = {
      [EVENTS.newMessage]: this.newMessage.bind(this),
      [EVENTS.agentMessage]: this.agentMessage.bind(this),
      [EVENTS.chatbotMessage]: this.chatbotMessage.bind(this),
      [EVENTS.customerReply]: this.customerReply.bind(this),
      [EVENTS.messageUpdated]: this.messageUpdated.bind(this),
      [EVENTS.workflowMessage]: this.workflowMessage.bind(this),
    };
  }

  async __customerMessage(conversationMessage, ticket, chatbotProfile) {
    let conversationServiceInst = new ConversationService();
    let { workspaceId, clientId } = conversationMessage;
    let botMessage;
    try {
      // let chatbotProfile = { // pick from chatbot profile
      //   name: 'Pullse AI - ChatBot',
      //   assistantId: 'Pullse AI - ChatBot',
      //   channels: ['web', 'android', 'ios'],
      //   audience: ['customer', 'visitor'],
      // };
      await this.SocketClient.sendEvent(EventConstants.typing, {
        username: chatbotProfile.name, // pick from chatbot profile name
        ticketId: ticket.sno,
        workspaceId: workspaceId,
        userType: UserType.chatbot,
      }, [
        { level: 'workspace', userType: 'agent', id: workspaceId },
        { level: 'customer', userType: null, id: ticket.customerId, },
      ]);
      try {
        botMessage = await conversationServiceInst.addChatBotResponse({...ticket, workspaceId, clientId }, conversationMessage, chatbotProfile)
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      console.error(error);
      console.log("Error in getting LLM response");
    }
    return Promise.resolve(botMessage);
  }
  async newMessage(data) {
    let { conversationMessage, ticket } = data;
    let { workspaceId, clientId } = conversationMessage;
    ticket.workspaceId = workspaceId;
    ticket.clientId = clientId;

    let customerServiceInst = new CustomerService();
    let customer = await customerServiceInst.getDetails(ticket.customerId, workspaceId, clientId);
    let chatBotProfileServiceInst = new ChatBotProfileService();
    let botProfiles = await chatBotProfileServiceInst.paginate({ channel: ticket.device, audience: customer.type, workspaceId, clientId }, false);
    console.log("botProfiles.length", botProfiles.length);
    console.log("botProfiles IDs: ", botProfiles.map(p => p.id));
    let conversationServiceInst = new ConversationService();

    // getting ticket intent and sentiments
    let toUpdateTicket = {};
    try {
      let { intentData, sentimentData } = await conversationServiceInst.setTicketSentimentAndIntents(conversationMessage); // not sending ticket param to save a update query
      if (intentData && intentData.intents) {
        toUpdateTicket.intents = intentData.intents;
      }
      if (sentimentData && sentimentData.sentiments) {
        toUpdateTicket.sentiment = { text: sentimentData.sentiments, score: sentimentData.score };
      }
    } catch (error) {
      console.log("Error in getting sentiments");
      console.error(error);
    }

    if (!botProfiles.length) {
      console.log("No bot found for this conversation");
      /**
      * Run assign to agent flow here
      * */
      // run assign/route to agent flow here
      try {
        toUpdateTicket.assigneeTo = UserType.agent;
        // await conversationServiceInst.ticketInst.updateTicket({ sno: ticket.sno, workspaceId, clientId }, { assigneeTo: UserType.agent });
      } catch (error) {
        console.error(error);
      }
    } else {
      let botProfile = botProfiles[0];
      try {
        toUpdateTicket.assigneeTo = UserType.chatbot;
        toUpdateTicket.chatbotId = botProfile.id;
        // await conversationServiceInst.ticketInst.updateTicket({ sno: ticket.sno, workspaceId, clientId }, { assigneeTo: UserType.chatbot, chatbotId: botProfile.id });
      } catch (error) {
        console.error(error);
      }

      try {
        await this.__customerMessage(conversationMessage, ticket, botProfile); // do it asynchronously
      } catch (error) {
        console.error(error);
      }
    }

    try {
      if (!_.isEmpty(toUpdateTicket)) {
        await conversationServiceInst.ticketInst.updateOne({ id: ticket.id }, toUpdateTicket);
      }
    } catch (error) {
      console.error(error);
    }

    try {
      console.log("emitting event newMessage for workflow");
      let workflowEventPublisherInst = new WorkflowEventPublisher();
      await workflowEventPublisherInst.newMessage({ conversationMessage, ticket });
    } catch (error) {
      console.error(error);
    }
    return Promise.resolve(data);
  }

  async agentMessage(data) {
    let { conversationMessage, ticket } = data;
    console.log("execute agentMessage workflow", data);
    let { workspaceId, clientId } = conversationMessage;
    try {
      let userServiceInst = new UserService();
      let agent = await userServiceInst.getDetails(conversationMessage.createdBy, clientId);
      let userType = UserType.agent;

      await this.SocketClient.sendEvent(EventConstants.newMessage, {
        username: agent.name,
        user: agent.id,
        type: conversationMessage.type,
        message: conversationMessage.message,
        ticketId: ticket.sno,
        workspaceId,
        userType
      }, [
        // { level: 'workspace', userType: UserType.agent, id: workspaceId },
        { level: 'customer', userType: null, id: ticket.customerId, },
      ]);
    } catch (error) {
      console.error(error);
    }
  }

  async chatbotMessage(data) {
    let { conversationMessage, ticket } = data;
    let { workspaceId, clientId } = conversationMessage;
    console.log("chatbotMessage", data);
    if (ticket.assigneeTo == UserType.chatbot && ticket.chatbotId) { // to check if chat bot is assigned
      let chatBotProfileServiceInst = new ChatBotProfileService();
      try {
        let chatbotProfile = await chatBotProfileServiceInst.getDetails(ticket.chatbotId, workspaceId, clientId);
        let userType = UserType.chatbot;
        await this.SocketClient.sendEvent(EventConstants.stopTyping, {
          username: chatbotProfile.name,
          user: UserType.chatbot,
          ticketId: ticket.sno,
          workspaceId: conversationMessage.workspaceId,
          userType
        }, [
          { level: 'workspace', userType: UserType.agent, id: workspaceId },
          { level: 'customer', userType: null, id: ticket.customerId, },
        ]);

        await this.SocketClient.sendEvent(EventConstants.newMessage, {
          username: chatbotProfile.name,
          message: conversationMessage.message,
          type: conversationMessage.type,
          ticketId: ticket.sno,
          workspaceId: conversationMessage.workspaceId,
          userType
        }, [
          { level: 'workspace', userType: UserType.agent, id: workspaceId },
          { level: 'customer', userType: null, id: ticket.customerId, },
        ]);
      } catch (error) {
        console.error(error);
      }
    }
  }

  async customerReply(data) {
    let { conversationMessage, ticket } = data;
    let { workspaceId, clientId } = conversationMessage;
    console.log("customerReply", data);
    try {
      let customerServiceInst = new CustomerService();
      let customer = await customerServiceInst.getDetails(ticket.customerId, workspaceId, clientId);
        await this.SocketClient.sendEvent(EventConstants.newMessage, {
          username: customer.name || customer.email,
          user: customer.id,
          message: conversationMessage.message,
          type: conversationMessage.type,
          ticketId: ticket.sno,
          workspaceId: workspaceId,
          userType: UserType.customer
        }, [
          { level: 'workspace', userType: UserType.agent, id: workspaceId },
          // { level: 'customer', userType: null, id: ticket.customerId, },
        ]);
    } catch (error) {
      console.error(error);
    }

    // setting ticket intent and sentiments
    let conversationServiceInst = new ConversationService();
    try {
      await conversationServiceInst.setTicketSentimentAndIntents(conversationMessage, ticket);
    } catch (error) {
      console.log("Error in getting sentiments");
      console.error(error);
    }

    if (ticket.assigneeTo == UserType.chatbot && ticket.chatbotId) { // to check if chat bot is assigned
      let chatBotProfileServiceInst = new ChatBotProfileService();
      try {
        let botProfile = await chatBotProfileServiceInst.getDetails(ticket.chatbotId, workspaceId, clientId);
        // check if bot answer mode is loop
        await this.__customerMessage(conversationMessage, ticket, botProfile);
      } catch (error) {
        console.error(error);
      }
    }
  }

  async workflowMessage() {
    console.log("workflowMessage");
  }

  async messageUpdated() {
    console.log("messageUpdated");
  }

}


module.exports = ConversationEventConsumer;
