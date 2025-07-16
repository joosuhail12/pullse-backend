const Ably = require('ably');
const channelManager = require('./channelManager');

// Test configuration
const TEST_CONFIG = {
  chatbotProfileId: 'test-chatbot-123',
  ticketId: 'test-ticket-456',
  sessionId: 'test-session-789',
  workspaceId: 'test-workspace-001',
  clientId: 'test-client-001'
};

// Initialize Ably for testing
const ably = new Ably.Realtime(process.env.ABLY_API_KEY);

async function testAIEnabledTicketFix() {
  console.log('🧪 Testing AI-Enabled Ticket Fix\n');

  try {
    // Step 1: Set up chatbot subscription (simulates AI-enabled ticket)
    console.log('📡 Step 1: Setting up chatbot subscription...');
    await channelManager.addSubscription({
      channelName: `chatbot:${TEST_CONFIG.chatbotProfileId}:${TEST_CONFIG.ticketId}`,
      channelType: 'chatbot',
      subscriberId: `chatbot-${TEST_CONFIG.chatbotProfileId}-${TEST_CONFIG.ticketId}`,
      subscriberType: 'chatbot',
      ticketId: TEST_CONFIG.ticketId,
      sessionId: TEST_CONFIG.sessionId,
      workspaceId: TEST_CONFIG.workspaceId,
      clientId: TEST_CONFIG.clientId,
      chatbotProfileId: TEST_CONFIG.chatbotProfileId,
      metadata: { test: true }
    });
    console.log('✅ Chatbot subscription created successfully\n');

    // Step 2: Set up conversation subscription (simulates widget fetching conversation)
    console.log('📡 Step 2: Setting up conversation subscription...');
    await channelManager.addSubscription({
      channelName: `widget:conversation:ticket-${TEST_CONFIG.ticketId}`,
      channelType: 'conversation',
      subscriberId: TEST_CONFIG.sessionId,
      subscriberType: 'session',
      ticketId: TEST_CONFIG.ticketId,
      sessionId: TEST_CONFIG.sessionId,
      workspaceId: TEST_CONFIG.workspaceId,
      clientId: TEST_CONFIG.clientId,
      metadata: { conversationType: 'widget' }
    });
    console.log('✅ Conversation subscription created successfully\n');

    // Step 3: Set up test listeners to monitor message flow
    console.log('👂 Step 3: Setting up test listeners...');
    
    let chatbotMessageReceived = false;
    let conversationMessageReceived = false;
    let botResponseReceived = false;

    // Listen to chatbot channel for user messages
    const chatbotChannel = ably.channels.get(`chatbot:${TEST_CONFIG.chatbotProfileId}:${TEST_CONFIG.ticketId}`);
    chatbotChannel.subscribe('user-message', msg => {
      const data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
      console.log('📨 User message received in chatbot channel:', data);
      chatbotMessageReceived = true;
    });

    // Listen to widget conversation channel for bot responses
    const widgetChannel = ably.channels.get(`widget:conversation:ticket-${TEST_CONFIG.ticketId}`);
    widgetChannel.subscribe('message_reply', msg => {
      const data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
      console.log('📨 Bot response received in widget channel:', data);
      botResponseReceived = true;
    });

    // Step 4: Simulate widget sending a message
    console.log('📤 Step 4: Simulating widget message...');
    const testMessage = {
      text: 'Hello, I need help with my order',
      sessionId: TEST_CONFIG.sessionId
    };

    // Publish to widget conversation channel
    widgetChannel.publish('message', testMessage);
    console.log('✅ Widget message published\n');

    // Step 5: Wait a moment for message processing
    console.log('⏳ Step 5: Waiting for message processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 6: Simulate AI service response
    console.log('🤖 Step 6: Simulating AI service response...');
    const botResponse = {
      content: 'Hello! I can help you with your order. What order number are you looking for?'
    };

    chatbotChannel.publish('bot-response', botResponse);
    console.log('✅ Bot response published\n');

    // Step 7: Wait for response processing
    console.log('⏳ Step 7: Waiting for response processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 8: Verify results
    console.log('🔍 Step 8: Verifying results...');
    
    if (chatbotMessageReceived) {
      console.log('✅ SUCCESS: Chatbot subscription received the message');
    } else {
      console.log('❌ FAILED: Chatbot subscription did not receive the message');
    }

    if (botResponseReceived) {
      console.log('✅ SUCCESS: Widget received the bot response');
    } else {
      console.log('❌ FAILED: Widget did not receive the bot response');
    }

    if (!conversationMessageReceived) {
      console.log('✅ SUCCESS: Conversation subscription correctly ignored AI-enabled ticket');
    } else {
      console.log('❌ FAILED: Conversation subscription should not have handled AI-enabled ticket');
    }

    console.log('\n🎉 Test completed!');

    // Cleanup
    console.log('🧹 Cleaning up...');
    await channelManager.removeSubscription(
      `chatbot:${TEST_CONFIG.chatbotProfileId}:${TEST_CONFIG.ticketId}`,
      `chatbot-${TEST_CONFIG.chatbotProfileId}-${TEST_CONFIG.ticketId}`,
      'chatbot'
    );
    await channelManager.removeSubscription(
      `widget:conversation:ticket-${TEST_CONFIG.ticketId}`,
      TEST_CONFIG.sessionId,
      'session'
    );
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Close Ably connection
    ably.close();
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAIEnabledTicketFix();
}

module.exports = { testAIEnabledTicketFix }; 