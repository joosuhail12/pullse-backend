module.exports = {
  events: {
    newMessage: 'new_message',
    agentMessage: 'agent_message',
    workflowMessage: 'workflow_message',
    chatbotMessage: 'chatbot_message',
    customerReply: 'customer_reply',
    messageUpdated: 'message_updated',
  },
  queue: 'message_events'
};