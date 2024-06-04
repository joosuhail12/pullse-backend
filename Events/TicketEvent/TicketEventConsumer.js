const { events: EVENTS, queue } = require('./config');
const { EventConsumer } = require('../Event');
const { WorkflowEventPublisher } = require('../WorkflowEvent');
const EventConstants = require("../../Socket/EventConstants");
const { Status: TicketStatus, EntityType: TicketEntityType, MessageType } = require("../../constants/TicketConstants");
const ConversationService = require('../../services/ConversationService');
const { UserType } = require('../../constants/ClientConstants');
const LLMServiceExternalService = require('../../ExternalService/LLMServiceExternalService');
const TicketService = require('../../services/TicketService');


class TicketEventConsumer extends EventConsumer {
  constructor(SocketClient) {
    super();
    this.queue = queue;
    this.SocketClient = SocketClient;
    this.EventHandlers = {
      [EVENTS.newTicket]: this.created.bind(this),
      [EVENTS.ticketUpdated]: this.updated.bind(this),
      [EVENTS.ticketClosed]: this.ticketClosed.bind(this),
      [EVENTS.summarizeConversation]: this.summarizeConversation.bind(this),

    };
  }

  async created(data) {
    let { ticket } = data;
    console.log("New ticket", ticket);
    this.SocketClient.sendEvent(EventConstants.newTicket, { ticket }, [
      { level: 'workspace', userType: 'agent', id: ticket.workspaceId },
      // { level: 'workspace', userType: 'customer', id: "id", },
      // { level: 'agent', userType: null, id: "id", },
      // { level: 'customer', userType: null, id: "id", },
    ]);
    let workflowEventPublisherInst = new WorkflowEventPublisher();
    await workflowEventPublisherInst.newTicket(data);
    return Promise.resolve(data);
  }

  async updated(data) {
    let { ticket, updateValues } = data;
    console.log("ticket Updated", {ticket, updateValues});
    try {
      let workflowEventPublisherInst = new WorkflowEventPublisher();
      await workflowEventPublisherInst.ticketUpdated({ ticket, updateValues });
    } catch (error) {
      console.error(error);
    }
    return Promise.resolve(data);
  }

  async ticketClosed(data) {
    let { ticket } = data;
    try {
      if (!ticket.qa && ticket.assigneeTo == UserType.agent && ticket.entityType == TicketEntityType.conversation) {
        let inst = new ConversationService();
        await inst.conversationQA(ticket);
      }
    } catch (error) {
      console.error(error);
    }
    try {
      let workflowEventPublisherInst = new WorkflowEventPublisher();
      await workflowEventPublisherInst.ticketClosed({ ticket });
    } catch (error) {
      console.error(error);
    }
    return Promise.resolve(data);
  }

  async summarizeConversation(data) {
    let { ticket, user } = data;
    try {
      let conversationServiceInst = new ConversationService();
      let conversationText = await conversationServiceInst.getAllMessageOfConversation(ticket.id);
      let llmServiceExternalServiceInst = new LLMServiceExternalService();
      let summaryText = await llmServiceExternalServiceInst.summarize(conversationText);
      await conversationServiceInst.addMessage({ ticketId: ticket.id, message: summaryText, type: MessageType.summary, userType: UserType.agent, createdBy: user.id, workspaceId: ticket.workspaceId, clientId: ticket.clientId });
      let ticketServiceInst = new TicketService();
      await ticketServiceInst.updateTicket({ sno: ticket.sno, workspaceId: ticket.workspaceId, clientId: ticket.clientId }, { summary: summaryText });
      ticket.summary = summaryText;
    } catch (error) {
      console.error(error);
    }
    return Promise.resolve(ticket);
  }
}


module.exports = TicketEventConsumer;