# Chatbot Bidirectional Communication

This document explains how the chatbot bidirectional communication works in the Ably channel manager.

## Overview

When a chatbot connection is established, the system creates a bidirectional communication bridge between:
1. **Chatbot Channel**: `chatbot:{chatbotProfileId}:{ticketId}`
2. **Widget Conversation Channel**: `widget:conversation:ticket-{ticketId}`

**Note**: To avoid conflicts with the regular conversation flow, widget messages are not automatically forwarded to the chatbot. Instead, you need to manually forward messages when appropriate.

## Flow Diagram

```
Widget User → Widget Channel → Manual Forward → Chatbot Channel → AI Service
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

The system sets up one event handler:

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

#### B. Manual Widget Message Forwarding
- **Trigger**: Manual call when widget message should be sent to chatbot
- **Publishes to**: `user-message` event on chatbot channel
- **Purpose**: Forwards user messages to the AI service when appropriate

```javascript
const { forwardWidgetMessageToChatbot } = require('./ablyServices/listeners');

// When you want to forward a widget message to chatbot
await forwardWidgetMessageToChatbot(messageData, chatbotProfileId, ticket_id, session_id);
```

## Message Flow

### User Sends Message
1. Widget user types message
2. Widget publishes to `widget:conversation:ticket-{ticketId}` with `message` event
3. **Manual Step**: Call `forwardWidgetMessageToChatbot()` when appropriate
4. Message is forwarded to `chatbot:{chatbotProfileId}:{ticketId}` with `user-message` event
5. AI service processes the message

### AI Responds
1. AI service publishes response to `chatbot:{chatbotProfileId}:{ticketId}` with `bot-response` event
2. Chatbot handler receives response and forwards to `widget:conversation:ticket-{ticketId}` with `message_reply` event
3. Widget displays the response to the user

## Usage Example

```javascript
// 1. Set up chatbot subscription
const { subscribeToChatbotPrimary } = require('./ablyServices/listeners');
await subscribeToChatbotPrimary(chatbotProfileId, ticketId);

// 2. Send message from widget
const widgetChannel = ably.channels.get(`widget:conversation:ticket-${ticketId}`);
widgetChannel.publish('message', {
  text: 'Hello, I need help with my order',
  sessionId: sessionId
});

// 3. Manually forward to chatbot when appropriate
const { forwardWidgetMessageToChatbot } = require('./ablyServices/listeners');
await forwardWidgetMessageToChatbot(
  { text: 'Hello, I need help with my order' },
  chatbotProfileId,
  ticketId,
  sessionId
);

// 4. AI service responds (this will be automatically forwarded to widget)
const chatbotChannel = ably.channels.get(`chatbot:${chatbotProfileId}:${ticketId}`);
chatbotChannel.publish('bot-response', {
  content: 'Hello! I can help you with your order. What order number are you looking for?'
});
```

## Integration with Regular Conversation Flow

To integrate with the regular conversation flow, you can modify the `handleWidgetConversationEvent` function in `routing.js`:

```javascript
const handleWidgetConversationEvent = async (ticketId, messageData, sessionId, channelManagerInstance) => {
  // ... existing code ...

  // Check if this ticket has a chatbot assigned
  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select('chatbotId')
    .eq('id', ticketId)
    .single();

  if (ticket && ticket.chatbotId) {
    // Forward message to chatbot
    const { forwardWidgetMessageToChatbot } = require('./ablyServices/listeners');
    await forwardWidgetMessageToChatbot(messageData, ticket.chatbotId, ticketId, sessionId);
  }

  // ... rest of existing code ...
};
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
1. Unsubscribes from bot-response events
2. Removes the subscription from the active subscriptions cache
3. Marks the subscription as inactive in the database

## Benefits

1. **No Conflicts**: Avoids interference with regular conversation flow
2. **Flexible Control**: You decide when to forward messages to chatbot
3. **Scalable**: Multiple chatbots can be connected to different tickets
4. **Reliable**: Uses Ably's reliable messaging infrastructure
5. **Debuggable**: Comprehensive logging for troubleshooting
6. **Flexible**: Easy to extend for additional message types or channels 