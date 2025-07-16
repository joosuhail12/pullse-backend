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

```javascript
chatbotCh.subscribe('bot-response', msg => {
  const message = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
  
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

```javascript
widgetConversationCh.subscribe('message', msg => {
  const messageData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
  
  const payload = {
    content: messageData.text || messageData.content || messageData.message,
    ticketId: ticket_id,
    sessionId: session_id
  };
  
  chatbotCh.publish('user-message', payload);
});
```

## Message Flow

### User Sends Message
1. Widget user types message
2. Widget publishes to `widget:conversation:ticket-{ticketId}` with `message` event
3. Chatbot handler receives message and forwards to `chatbot:{chatbotProfileId}:{ticketId}` with `user-message` event
4. AI service processes the message

### AI Responds
1. AI service publishes response to `chatbot:{chatbotProfileId}:{ticketId}` with `bot-response` event
2. Chatbot handler receives response and forwards to `widget:conversation:ticket-{ticketId}` with `message_reply` event
3. Widget displays the response to the user

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
- Successful publishes are logged for debugging
- Subscription setup is logged with ticket information
- Unsubscribe operations handle both single and multiple subscriptions

## Cleanup

When a chatbot subscription is removed:

```javascript
await channelManager.removeSubscription(
  `chatbot:${chatbotProfileId}:${ticketId}`,
  `chatbot-${chatbotProfileId}-${ticketId}`,
  'chatbot'
);
```

This automatically:
1. Unsubscribes from both bot-response and widget-message events
2. Removes the subscription from the active subscriptions cache
3. Marks the subscription as inactive in the database

## Benefits

1. **Seamless Integration**: Widget users don't need to know they're talking to an AI
2. **Scalable**: Multiple chatbots can be connected to different tickets
3. **Reliable**: Uses Ably's reliable messaging infrastructure
4. **Debuggable**: Comprehensive logging for troubleshooting
5. **Flexible**: Easy to extend for additional message types or channels 