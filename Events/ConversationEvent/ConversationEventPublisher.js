const { events: EVENTS, queue } = require('./config');
const { EventPublisher } = require('../Event');
const { UserType } = require('../../constants/ClientConstants');

class ConversationEventPublisher extends EventPublisher {

  constructor() {
    super();
    this.queue = queue;
  }

  async created(conversationMessage, ticket, newTicket=false) {
    let event;
    switch (conversationMessage.userType) {
      case UserType.customer:
        if (newTicket) {
          event = EVENTS.newMessage;
        } else {
          event = EVENTS.customerReply;
        }
        break;

      case UserType.chatbot:
        event = EVENTS.chatbotMessage;
        break;

      case UserType.agent:
        event = EVENTS.agentMessage;
        break;

      case UserType.workflow:
        event = EVENTS.workflowMessage;
        // event = EVENTS.agentMessage;
        break;
    }
    if (!event) {
      console.log({ conversationMessage });
      throw new Error("Event not defined");
    }
    return this.publish(event, { conversationMessage, ticket });
  }

  async updated(message, updateValues) {
    return this.publish(EVENTS.messageUpdated, { message, updateValues });
  }

  async started(ticket, widgetSession) {
    return this.publish(EVENTS.newConversation, { ticket, widgetSession });
  }

}

module.exports = ConversationEventPublisher;
