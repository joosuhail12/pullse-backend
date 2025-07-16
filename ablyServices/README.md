# Ably Services - Chatbot Bidirectional Communication

This module provides bidirectional communication between chatbot AI services and widget conversations using Ably channels.

## Features

- **Bidirectional Communication**: Seamless message flow between widget users and AI chatbots
- **Manual Control**: You decide when to forward messages to chatbots (no conflicts with regular flow)
- **Automatic Channel Management**: Handles subscription creation, cleanup, and error recovery
- **Comprehensive Logging**: Detailed logs for debugging and monitoring
- **Scalable Architecture**: Supports multiple chatbots and tickets simultaneously

## Quick Start

### 1. Set up Chatbot Subscription

```javascript
const { subscribeToChatbotPrimary } = require('./ablyServices/listeners');

// When a chatbot is assigned to a ticket
await subscribeToChatbotPrimary(chatbotProfileId, ticketId);
```

### 2. Send Messages from Widget

```javascript
const ably = new Ably.Realtime(process.env.ABLY_API_KEY);
const widgetChannel = ably.channels.get(`widget:conversation:ticket-${ticketId}`);

// User sends a message
widgetChannel.publish('message', {
  text: 'Hello, I need help with my order',
  sessionId: sessionId
});
```

### 3. Manually Forward to Chatbot (when appropriate)

```javascript
const { forwardWidgetMessageToChatbot } = require('./ablyServices/listeners');

// Forward message to chatbot when needed
await forwardWidgetMessageToChatbot(
  { text: 'Hello, I need help with my order' },
  chatbotProfileId,
  ticketId,
  sessionId
);
```

### 4. AI Service Responds

```javascript
const chatbotChannel = ably.channels.get(`chatbot:${chatbotProfileId}:${ticketId}`);

// AI service sends response
chatbotChannel.publish('bot-response', {
  content: 'Hello! I can help you with your order. What order number are you looking for?'
});
```

## Channel Structure

### Chatbot Channel
- **Format**: `chatbot:{chatbotProfileId}:{ticketId}`
- **Events**:
  - `user-message`: Messages from widget users (manually forwarded)
  - `bot-response`: Responses from AI service

### Widget Conversation Channel
- **Format**: `widget:conversation:ticket-{ticketId}`
- **Events**:
  - `message`: Messages from widget users
  - `message_reply`: Responses to widget users

## Message Flow

```
Widget User → widget:conversation:ticket-{ticketId} (message)
     ↓
Manual Forward → chatbot:{chatbotProfileId}:{ticketId} (user-message)
     ↓
AI Service processes message
     ↓
AI Service → chatbot:{chatbotProfileId}:{ticketId} (bot-response)
     ↓
Chatbot Handler → widget:conversation:ticket-{ticketId} (message_reply)
     ↓
Widget User receives response
```

## API Reference

### ChannelManager

#### `addSubscription(subscriptionData)`
Creates a new channel subscription.

```javascript
await channelManager.addSubscription({
  channelName: `chatbot:${chatbotProfileId}:${ticketId}`,
  channelType: 'chatbot',
  subscriberId: `chatbot-${chatbotProfileId}-${ticketId}`,
  subscriberType: 'chatbot',
  ticketId: ticketId,
  sessionId: sessionId,
  workspaceId: workspaceId,
  clientId: clientId,
  chatbotProfileId: chatbotProfileId,
  metadata: { chatbotProfile: chatbotProfileId }
});
```

#### `removeSubscription(channelName, subscriberId, subscriberType)`
Removes a channel subscription.

```javascript
await channelManager.removeSubscription(
  `chatbot:${chatbotProfileId}:${ticketId}`,
  `chatbot-${chatbotProfileId}-${ticketId}`,
  'chatbot'
);
```

### Listeners

#### `subscribeToChatbotPrimary(chatbotProfileId, ticketId)`
Convenience function to set up chatbot subscription.

```javascript
const { subscribeToChatbotPrimary } = require('./ablyServices/listeners');
await subscribeToChatbotPrimary(chatbotProfileId, ticketId);
```

#### `forwardWidgetMessageToChatbot(messageData, chatbotProfileId, ticketId, sessionId)`
Manually forward a widget message to the chatbot.

```javascript
const { forwardWidgetMessageToChatbot } = require('./ablyServices/listeners');
await forwardWidgetMessageToChatbot(
  { text: 'Hello, I need help' },
  chatbotProfileId,
  ticketId,
  sessionId
);
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

## Testing

Run the test script to verify the bidirectional communication:

```bash
# Set environment variables
export ABLY_API_KEY="your-ably-api-key"
export SUPABASE_URL="your-supabase-url"
export SUPABASE_KEY="your-supabase-key"

# Run test
node ablyServices/test_chatbot_bidirectional.js
```

## Error Handling

The system includes comprehensive error handling:

- **Failed Publishes**: Logged with ticket context
- **Subscription Errors**: Graceful fallback and retry mechanisms
- **Connection Issues**: Automatic reconnection handling
- **Invalid Messages**: Validation and error logging

## Logging

All operations are logged with the following format:

```
[ChannelManager] Setting up chatbot bidirectional communication for ticket {ticketId}
[ChannelManager] Bot response received for ticket {ticketId}: {message}
[ChannelManager] Publishing bot response to widget conversation for ticket {ticketId}: {payload}
[ChannelManager] Successfully published bot response to widget conversation for ticket {ticketId}
[Listeners] Forwarding widget message to chatbot for ticket {ticketId}: {payload}
[Listeners] Successfully forwarded widget message to chatbot for ticket {ticketId}
```

## Best Practices

1. **Always Clean Up**: Remove subscriptions when they're no longer needed
2. **Handle Errors**: Implement proper error handling for failed publishes
3. **Monitor Logs**: Use the comprehensive logging for debugging
4. **Test Thoroughly**: Use the provided test script to verify functionality
5. **Use Metadata**: Include relevant metadata in subscriptions for debugging
6. **Manual Control**: Only forward messages to chatbot when appropriate

## Troubleshooting

### Common Issues

1. **Messages Not Forwarding**
   - Check if chatbot subscription is active
   - Verify channel names match exactly
   - Check Ably connection status
   - Ensure you're calling `forwardWidgetMessageToChatbot` when needed

2. **Subscription Not Created**
   - Verify environment variables are set
   - Check Supabase connection
   - Ensure all required parameters are provided

3. **Messages Lost**
   - Check Ably quota limits
   - Verify network connectivity
   - Review error logs for failed publishes

4. **Bot User Error**
   - This error occurs when the regular conversation flow tries to fetch bot users
   - The chatbot bidirectional communication is separate and doesn't require bot users
   - Use manual forwarding to avoid conflicts

### Debug Commands

```javascript
// Check active subscriptions
const stats = await channelManager.getStats();
console.log('Active subscriptions:', stats);

// Get specific subscription
const subscription = await channelManager.getSubscription(
  `chatbot:${chatbotProfileId}:${ticketId}`,
  `chatbot-${chatbotProfileId}-${ticketId}`,
  'chatbot'
);
console.log('Subscription:', subscription);
```

## Contributing

When adding new features:

1. Update the documentation
2. Add comprehensive logging
3. Include error handling
4. Create tests for new functionality
5. Update the README with new API methods

## License

This module is part of the Pullse backend system. 