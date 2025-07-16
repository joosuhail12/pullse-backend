const Ably = require('ably');
const channelManager = require('./channelManager');
const { forwardWidgetMessageToChatbot } = require('./listeners');

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

async function testChatbotBidirectionalCommunication() {
  console.log('🧪 Starting Chatbot Bidirectional Communication Test\n');

  try {
    // Step 1: Set up chatbot subscription
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

    // Step 2: Set up test listeners
    console.log('👂 Step 2: Setting up test listeners...');
    
    // Listen to widget conversation channel for bot responses
    const widgetChannel = ably.channels.get(`widget:conversation:ticket-${TEST_CONFIG.ticketId}`);
    widgetChannel.subscribe('message_reply', msg => {
      const data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
      console.log('📨 Bot response received in widget channel:', data);
    });

    // Listen to chatbot channel for user messages
    const chatbotChannel = ably.channels.get(`chatbot:${TEST_CONFIG.chatbotProfileId}:${TEST_CONFIG.ticketId}`);
    chatbotChannel.subscribe('user-message', msg => {
      const data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
      console.log('📨 User message received in chatbot channel:', data);
    });

    console.log('✅ Test listeners set up successfully\n');

    // Step 3: Simulate user sending message
    console.log('💬 Step 3: Simulating user message...');
    const userMessage = {
      text: 'Hello, I need help with my order #12345',
      sessionId: TEST_CONFIG.sessionId
    };
    
    widgetChannel.publish('message', userMessage);
    console.log('✅ User message sent to widget channel\n');

    // Step 4: Manually forward message to chatbot
    console.log('🔄 Step 4: Manually forwarding message to chatbot...');
    await forwardWidgetMessageToChatbot(
      userMessage,
      TEST_CONFIG.chatbotProfileId,
      TEST_CONFIG.ticketId,
      TEST_CONFIG.sessionId
    );
    console.log('✅ Message forwarded to chatbot\n');

    // Step 5: Simulate AI response
    console.log('🤖 Step 5: Simulating AI response...');
    setTimeout(() => {
      const aiResponse = {
        content: 'Hello! I can help you with your order #12345. What specific issue are you experiencing?',
        ticketId: TEST_CONFIG.ticketId,
        sessionId: TEST_CONFIG.sessionId
      };
      
      chatbotChannel.publish('bot-response', aiResponse);
      console.log('✅ AI response sent to chatbot channel\n');
    }, 1000);

    // Step 6: Simulate another user message
    console.log('💬 Step 6: Simulating another user message...');
    setTimeout(async () => {
      const userMessage2 = {
        text: 'My order hasn\'t arrived yet. It was supposed to be delivered yesterday.',
        sessionId: TEST_CONFIG.sessionId
      };
      
      widgetChannel.publish('message', userMessage2);
      console.log('✅ Second user message sent to widget channel\n');

      // Manually forward second message to chatbot
      console.log('🔄 Step 6b: Manually forwarding second message to chatbot...');
      await forwardWidgetMessageToChatbot(
        userMessage2,
        TEST_CONFIG.chatbotProfileId,
        TEST_CONFIG.ticketId,
        TEST_CONFIG.sessionId
      );
      console.log('✅ Second message forwarded to chatbot\n');
    }, 2000);

    // Step 7: Simulate another AI response
    console.log('🤖 Step 7: Simulating another AI response...');
    setTimeout(() => {
      const aiResponse2 = {
        content: 'I apologize for the delay. Let me check the status of your order. Can you please provide your shipping address to help me track it?',
        ticketId: TEST_CONFIG.ticketId,
        sessionId: TEST_CONFIG.sessionId
      };
      
      chatbotChannel.publish('bot-response', aiResponse2);
      console.log('✅ Second AI response sent to chatbot channel\n');
    }, 3000);

    // Step 8: Cleanup after test
    console.log('🧹 Step 8: Cleaning up after test...');
    setTimeout(async () => {
      try {
        await channelManager.removeSubscription(
          `chatbot:${TEST_CONFIG.chatbotProfileId}:${TEST_CONFIG.ticketId}`,
          `chatbot-${TEST_CONFIG.chatbotProfileId}-${TEST_CONFIG.ticketId}`,
          'chatbot'
        );
        console.log('✅ Chatbot subscription removed successfully');
        console.log('\n🎉 Test completed successfully!');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  console.log('🚀 Chatbot Bidirectional Communication Test');
  console.log('==========================================\n');
  
  // Check if required environment variables are set
  if (!process.env.ABLY_API_KEY) {
    console.error('❌ ABLY_API_KEY environment variable is required');
    process.exit(1);
  }
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_KEY environment variables are required');
    process.exit(1);
  }
  
  testChatbotBidirectionalCommunication();
}

module.exports = { testChatbotBidirectionalCommunication }; 