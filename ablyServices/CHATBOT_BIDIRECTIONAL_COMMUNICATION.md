# Chatbot Bidirectional Communication

This document explains how the chatbot bidirectional communication works in the Ably channel manager.

## Overview

When a chatbot connection is established, the system creates a bidirectional communication bridge between:
1. **Chatbot Channel**: `chatbot:{chatbotProfileId}:{ticketId}`
2. **Widget Conversation Channel**: `widget:conversation:ticket-{ticketId}`

## Flow Diagram

```
Widget User → Widget Channel → Chatbot Channel → AI Service
     ↑                                    ↓
     ← Widget Channel ← Chatbot Channel ← AI Response
```

## Channel Setup

### 1. Chatbot Subscription Creation

When a chatbot is assigned to a ticket, the system calls:

```javascript
await channelManager.addSubscription({
  channelName: `chatbot:${chatbotProfileId}:${ticketId}`,
  channelType: 'chatbot',
  subscriberId: `chatbot-${chatbotProfileId}-${ticketId}`,
  subscriberType: 'chatbot',
  ticketId: ticketId,
  workspaceId: workspaceId,
  clientId: clientId,
  chatbotProfileId,
  metadata: { chatbotProfile: chatbotProfileId }
});
```

### 2. Bidirectional Event Handlers

The system sets up two event handlers:

#### A. Bot Response Handler
- **Listens to**: `bot-response` event on chatbot channel
- **Publishes to**: `message_reply` event on widget conversation channel
- **Purpose**: Forwards AI responses to the widget user
- **Persistence**: Automatically saves bot responses to the database

```javascript
chatbotCh.subscribe('bot-response', async msg => {
  const message = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
  
  // Persist bot response
  await IS.saveConversation(ticket_id, message.content, botUserId, 'bot', botName, clientId, workspaceId);
  
  // Forward to widget
  const widgetConversationCh = ably.channels.get(`widget:conversation:ticket-${ticket_id}`);
  const payload = {
    ticketId: ticket_id,
    message: message.content || message,
    from: 'bot',
    to: 'customer',
    sessionId: session_id
  };
  
  widgetConversationCh.publish('message_reply', payload);
});
```

#### B. Widget Message Handler
- **Listens to**: `message` event on widget conversation channel
- **Publishes to**: `user-message` event on chatbot channel
- **Purpose**: Forwards user messages to the AI service
- **Persistence**: Automatically saves user messages to the database

```javascript
widgetConversationCh.subscribe('message', async msg => {
  const messageData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
  
  // Persist user message
  await IS.saveConversation(ticket_id, messageData.text, customerId, 'customer', customerName, clientId, workspaceId);
  
  // Forward to chatbot
  const payload = {
    content: messageData.text || messageData.content || messageData.message,
    ticketId: ticket_id,
    sessionId: session_id
  };
  
  chatbotCh.publish('user-message', payload);
});
```

## Message Flow

### User Sends Message (AI-Enabled Ticket)
1. Widget user types message
2. Widget publishes to `widget:conversation:ticket-{ticketId}` with `message` event
3. **Chatbot subscription** receives message (conversation subscription ignores AI-enabled tickets)
4. Chatbot handler persists message and forwards to `chatbot:{chatbotProfileId}:{ticketId}` with `user-message` event
5. AI service processes the message

### AI Responds
1. AI service publishes response to `chatbot:{chatbotProfileId}:{ticketId}` with `bot-response` event
2. Chatbot handler persists response and forwards to `widget:conversation:ticket-{ticketId}` with `message_reply` event
3. Widget displays the response to the user

### User Sends Message (Non-AI Ticket)
1. Widget user types message
2. Widget publishes to `widget:conversation:ticket-{ticketId}` with `message` event
3. **Conversation subscription** receives message and handles agent routing
4. Message is persisted and forwarded to agent channels

## Conflict Resolution

The system prevents conflicts between conversation and chatbot subscriptions:

- **AI-Enabled Tickets**: Only the chatbot subscription handles messages
- **Non-AI Tickets**: Only the conversation subscription handles messages
- **Early Return**: `handleWidgetConversationEvent` returns early for AI-enabled tickets

## Usage Example

```javascript
// 1. Set up chatbot subscription
const { subscribeToChatbotPrimary } = require('./ablyServices/listeners');
await subscribeToChatbotPrimary(chatbotProfileId, ticketId);

// 2. Send message from widget (this will be automatically forwarded to chatbot)
const widgetChannel = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
widgetChannel.publish('message', {
  text: 'Hello, I need help with my order',
  sessionId: sessionId
});

// 3. AI service responds (this will be automatically forwarded to widget)
const chatbotChannel = ably.channels.get(`chatbot:${chatbotProfileId}:${ticketId}`);
chatbotChannel.publish('bot-response', {
  content: 'Hello! I can help you with your order. What order number are you looking for?'
});
```

## Error Handling

The system includes comprehensive error handling and logging:

- Failed publishes are logged with ticket context
- Message persistence failures don't block message forwarding
- Subscription errors are handled gracefully
- Invalid messages are validated and logged

## Logging

All operations are logged with the following format:

```
[ChannelManager] Widget message received for ticket {ticketId}, forwarding to chatbot
[ChannelManager] Message persisted for AI-enabled ticket {ticketId}
[ChannelManager] Publishing widget message to chatbot for ticket {ticketId}
[ChannelManager] Bot response received for ticket {ticketId}
[ChannelManager] Bot response persisted for ticket {ticketId}
[ChannelManager] Publishing bot response to widget conversation for ticket {ticketId}
``` 