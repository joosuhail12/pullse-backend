const { createClient } = require('@supabase/supabase-js');
const Ably = require('ably');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const ably = new Ably.Realtime(process.env.ABLY_API_KEY);

class ChannelManager {
  constructor() {
    this.activeSubscriptions = new Map(); // In-memory cache for active subscriptions
    this.initializeFromDatabase();
  }

  /**
   * Initialize channel subscriptions from database on server start
   */
  async initializeFromDatabase() {
    try {
      const { data: subscriptions, error } = await supabase
        .from('ably_channel_subscriptions')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading channel subscriptions:', error);
        return;
      }

      
      // Re-establish subscriptions
      for (const subscription of subscriptions || []) {
        await this.establishSubscription(subscription);
      }
    } catch (error) {
      console.error('Error initializing channel manager:', error);
    }
  }

  /**
   * Add a new channel subscription
   */
  async addSubscription(subscriptionData) {
    try {
      const {
        channelName,
        channelType,
        subscriberId,
        subscriberType,
        ticketId = null,
        sessionId = null,
        workspaceId = null,
        clientId = null,
        userId = null,
        chatbotProfileId = null,
        metadata = {}
      } = subscriptionData;

      // Check if subscription already exists
      const existingSubscription = await this.getSubscription(channelName, subscriberId, subscriberType);

      if (existingSubscription) {
        // Update existing subscription
        const { data, error } = await supabase
          .from('ably_channel_subscriptions')
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            metadata: { ...existingSubscription.metadata, ...metadata }
          })
          .eq('id', existingSubscription.id)
          .select()
          .single();

        if (error) throw error;
        
        return data;
      }

      // Create new subscription
      const { data, error } = await supabase
        .from('ably_channel_subscriptions')
        .insert({
          channel_name: channelName,
          channel_type: channelType,
          subscriber_id: subscriberId,
          subscriber_type: subscriberType,
          ticket_id: ticketId,
          session_id: sessionId,
          workspace_id: workspaceId,
          client_id: clientId,
          user_id: userId,
          chatbot_profile_id: chatbotProfileId,
          metadata
        })
        .select()
        .single();

      if (error) throw error;

      const {data: chatbotProfile, error: chatbotProfileError} = await supabase
        .from('chatbot')
        .select('*')
        .eq('id', chatbotProfileId)
        .single();
      if (chatbotProfileError) throw chatbotProfileError;

      // Establish the actual Ably subscription
      await this.establishSubscription({...data, chatbotProfile});
      
      return data;
    } catch (error) {
      console.error('Error adding channel subscription:', error);
      throw error;
    }
  }

  /**
   * Remove a channel subscription
   */
  async removeSubscription(channelName, subscriberId, subscriberType) {
    try {
      // Soft delete - mark as inactive
      const { data, error } = await supabase
        .from('ably_channel_subscriptions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('channel_name', channelName)
        .eq('subscriber_id', subscriberId)
        .eq('subscriber_type', subscriberType)
        .eq('is_active', true)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Unsubscribe from Ably channel
        await this.unsubscribeFromAbly(channelName, subscriberId, subscriberType);
      }

      return data;
    } catch (error) {
      console.error('Error removing channel subscription:', error);
      throw error;
    }
  }

  /**
   * Remove all subscriptions for a specific subscriber across different tickets
   */
  async removeSubscriberSubscriptions(subscriberId, subscriberType, excludeTicketId = null) {
    try {
        // check if already false then return
        const { data: subscription, error: subscriptionError } = await supabase
        .from('ably_channel_subscriptions')
        .select('*')
        .eq('subscriber_id', subscriberId)
        .eq('subscriber_type', subscriberType)
        .eq('is_active', false);    
        if (subscriptionError) {
            console.error('Error checking subscription:', subscriptionError);
        }
        if (subscription && subscription.length > 0) {
            console.log('Subscription already present for this ticket');
            return;
        }
      let query = supabase
        .from('ably_channel_subscriptions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('subscriber_id', subscriberId)
        .eq('subscriber_type', subscriberType)
        .eq('is_active', true);

      if (excludeTicketId) {
        query = query.neq('ticket_id', excludeTicketId);
      }

      const { data, error } = await query.select();

      if (error) throw error;

      // Unsubscribe from Ably channels
      for (const subscription of data || []) {
        await this.unsubscribeFromAbly(subscription.channel_name, subscriberId, subscriberType);
      }

      return data;
    } catch (error) {
      console.error('Error removing subscriber subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get a specific subscription
   */
  async getSubscription(channelName, subscriberId, subscriberType) {
    try {
      const { data, error } = await supabase
        .from('ably_channel_subscriptions')
        .select('*')
        .eq('channel_name', channelName)
        .eq('subscriber_id', subscriberId)
        .eq('subscriber_type', subscriberType)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    } catch (error) {
      console.error('Error getting subscription:', error);
      return null;
    }
  }

  /**
   * Get all active subscriptions for a channel
   */
  async getChannelSubscriptions(channelName) {
    try {
      const { data, error } = await supabase
        .from('ably_channel_subscriptions')
        .select('*')
        .eq('channel_name', channelName)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting channel subscriptions:', error);
      return [];
    }
  }

  /**
   * Get all subscriptions for a subscriber
   */
  async getSubscriberSubscriptions(subscriberId, subscriberType) {
    try {
      const { data, error } = await supabase
        .from('ably_channel_subscriptions')
        .select('*')
        .eq('subscriber_id', subscriberId)
        .eq('subscriber_type', subscriberType)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting subscriber subscriptions:', error);
      return [];
    }
  }

  /**
   * Get all subscriptions for a ticket
   */
  async getTicketSubscriptions(ticketId) {
    try {
      const { data, error } = await supabase
        .from('ably_channel_subscriptions')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting ticket subscriptions:', error);
      return [];
    }
  }

  /**
   * Establish Ably subscription from database record
   */
  async establishSubscription(subscriptionRecord) {
    try {
      const { channel_name, channel_type, subscriber_id, subscriber_type, chatbotProfile } = subscriptionRecord;
      
      // Create unique key for this subscription
      const subscriptionKey = `${channel_name}:${subscriber_id}:${subscriber_type}`;
      
      // Check if already subscribed
      if (this.activeSubscriptions.has(subscriptionKey)) {
        return;
      }

      const channel = ably.channels.get(channel_name);
      
      // Set up appropriate event handlers based on channel type
      const subscription = this.setupChannelHandlers(channel, channel_type, subscriptionRecord, channel_name, chatbotProfile);
      
      // Store in memory cache
      this.activeSubscriptions.set(subscriptionKey, {
        channel,
        subscription,
        record: subscriptionRecord
      });

    } catch (error) {
      console.error('Error establishing subscription:', error);
      throw error;
    }
  }

  /**
   * Setup channel event handlers based on channel type
   */
  async setupChannelHandlers(channel, channelType, subscriptionRecord, channel_name, chatbotProfile) {
    const { ticket_id, session_id } = subscriptionRecord;

    switch (channelType) {
      case 'widget_session':
        return channel.subscribe('new_ticket', async msg => {
          const d = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
          try {
            const { handleNewTicket } = require('./ticket');
            const ticket = await handleNewTicket({
              workspaceId: subscriptionRecord.workspace_id,
              sessionId: session_id,
              firstMessage: d.text || d.message,
              userType: 'customer'
            });
          } catch (e) {
            console.error('[channelManager] ticket create failed', e);
          }
        });

      case 'conversation':
        const subscription = channel.subscribe('message', m => {
          require('./routing').handleWidgetConversationEvent(ticket_id, m.data, session_id, this, channel_name);
        });
        
        channel.subscribe('user_action', async msg => {
          require('./routing').handleUserAction(ticket_id, msg.data, session_id);
        });
        
        return subscription;

      case 'ticket':
        return channel.subscribe('message', m => {
          require('./routing').handleTicketMessage(
            ticket_id, 
            m.data, 
            subscriptionRecord.client_id, 
            subscriptionRecord.workspace_id, 
            session_id, 
            subscriptionRecord.user_id
          );
        });

      case 'chatbot':
        console.log("channel_name:XXXXXXXXXXXXXXXXXXXXX", channel_name);
        const chatbotCh = ably.channels.get(channel_name);
        
        console.log(`[ChannelManager] Setting up chatbot bidirectional communication for ticket ${ticket_id}`);
        // save the conversationId in the database using internalService
        const internalService = require('./internalService');
        const IS = new internalService();
        
        const botResponseSubscription = chatbotCh.subscribe('bot-response', async msg => {
          console.log("msg:XXXXXXXXXXXXXXXXXXXXX", msg);
          const response = msg.data;
          const message = response.message;
          const conversation = await IS.saveConversation(
            ticket_id,
            response.data,
            chatbotProfile.user_id,
            'bot',
            chatbotProfile.name,
            chatbotProfile.clientId,
            chatbotProfile.workspaceId,
            'chat',
            null,
            null
          );
          console.log(`[ChannelManager] Bot response received for ticket ${ticket_id}:`, message);
          
          const widgetConversationCh = ably.channels.get(`widget:conversation:ticket-${ticket_id}`);
          const payload = {
            ticketId: ticket_id,
            id: conversation.id,
            message: response.data,
            messageType: "text",
            senderType: "ai",
            type: "ai",
            sessionId: session_id,
            conversationId: conversation.id,
          };
          //ticketId,
        //   id: conversation && conversation.id,
        //   message,
        //   type: "ai",
        //   senderType: "ai",
        //   messageType: "text"
          
          console.log(`[ChannelManager] Publishing bot response to widget conversation for ticket ${ticket_id}:`, payload);
          
          widgetConversationCh.publish('message_reply', payload, err => {
            if (err) {
              console.error(`[ChannelManager] Failed to publish bot response to widget conversation for ticket ${ticket_id}:`, err);
            } else {
              console.log(`[ChannelManager] Successfully published bot response to widget conversation for ticket ${ticket_id}`);
            }
          });
        });

        // Subscribe to messages from widget conversation to forward to chatbot
        const widgetConversationCh = ably.channels.get(`widget:conversation:ticket-${ticket_id}`);
        const widgetMessageSubscription = widgetConversationCh.subscribe('message', async msg => {
          const messageData = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
          console.log(`[ChannelManager] Widget message received for ticket ${ticket_id}, forwarding to chatbot:`, messageData);
          
          // Persist the user's message for AI-enabled tickets
          try {
            const internalService = require('./internalService');
            const IS = new internalService();
            
            // Get ticket details for customer info
            const { data: ticket, error: ticketError } = await supabase
              .from('tickets')
              .select('customers: customerId(id, firstname, lastname), clientId, workspaceId')
              .eq('id', ticket_id)
              .single();
            
            if (!ticketError && ticket) {
              await IS.saveConversation(
                ticket_id,
                messageData.text || messageData.content || messageData.message,
                ticket.customers.id,
                'customer',
                ticket.customers.firstname + " " + ticket.customers.lastname,
                ticket.clientId,
                ticket.workspaceId,
                "chat",
                messageData.attachmentType || null,
                messageData.attachmentUrl || null
              );
              console.log(`[ChannelManager] Message persisted for AI-enabled ticket ${ticket_id}`);
            }
          } catch (persistError) {
            console.error(`[ChannelManager] Failed to persist message for ticket ${ticket_id}:`, persistError);
            // Continue with forwarding even if persistence fails
          }
          
          // Forward message to chatbot's user-message event
          const payload = {
            content: messageData.text || messageData.content || messageData.message,
            ticketId: ticket_id,
            sessionId: session_id
          };
          
          console.log(`[ChannelManager] Publishing widget message to chatbot for ticket ${ticket_id}:`, payload);
          
          chatbotCh.publish('user-message', payload, err => {
            if (err) {
              console.error(`[ChannelManager] Failed to publish widget message to chatbot for ticket ${ticket_id}:`, err);
            } else {
              console.log(`[ChannelManager] Successfully published widget message to chatbot for ticket ${ticket_id}`);
            }
          });
        });

        console.log(`[ChannelManager] Chatbot bidirectional communication setup complete for ticket ${ticket_id}`);

        // Return both subscriptions (we'll store them in activeSubscriptions)
        return {
          botResponse: botResponseSubscription,
          widgetMessage: widgetMessageSubscription
        };

      case 'qa_results':
        return channel.subscribe(async (msg) => {
          const { ensureQaSubscription } = require('./qaSubscriptions');
          if (msg.data.answer && msg.data.id === ticket_id) {
            const internalService = require('./internalService');
            const IS = new internalService();
            
            const { data: users } = await supabase
              .from('users')
              .select('id, fName, lName, clientId, defaultWorkspaceId')
              .eq('bot_enabled', true)
              .single();

            if (users) {
              await IS.saveConversation(
                ticket_id, 
                msg.data.answer, 
                users.id, 
                'bot', 
                users.fName + " " + users.lName, 
                users.clientId, 
                users.defaultWorkspaceId
              );
            }

            const reCh = ably.channels.get(`widget:conversation:ticket-${ticket_id}`);
            await reCh.publish('message_reply', {
              ticketId: ticket_id,
              message: msg.data.answer,
              from: 'bot',
              to: 'customer',
              sessionId: session_id
            });
          }
        });

      default:
        console.warn(`Unknown channel type: ${channelType}`);
        return null;
    }
  }

  /**
   * Unsubscribe from Ably channel
   */
  async unsubscribeFromAbly(channelName, subscriberId, subscriberType) {
    try {
      const subscriptionKey = `${channelName}:${subscriberId}:${subscriberType}`;
      const subscriptionData = this.activeSubscriptions.get(subscriptionKey);
      
      if (subscriptionData) {
        // Handle chatbot subscriptions that have multiple subscriptions
        if (subscriptionData.subscription.botResponse && subscriptionData.subscription.widgetMessage) {
          subscriptionData.subscription.botResponse.unsubscribe();
          subscriptionData.subscription.widgetMessage.unsubscribe();
        } else {
          // Handle regular subscriptions
          subscriptionData.subscription.unsubscribe();
        }
        this.activeSubscriptions.delete(subscriptionKey);
      }
    } catch (error) {
      console.error('Error unsubscribing from Ably:', error);
    }
  }

  /**
   * Update subscription activity
   */
  async updateActivity(channelName, subscriberId, subscriberType) {
    try {
      const { error } = await supabase
        .from('ably_channel_subscriptions')
        .update({
          last_activity: new Date().toISOString()
        })
        .eq('channel_name', channelName)
        .eq('subscriber_id', subscriberId)
        .eq('subscriber_type', subscriberType)
        .eq('is_active', true);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating subscription activity:', error);
    }
  }

  /**
   * Clean up inactive subscriptions
   */
  async cleanupInactiveSubscriptions() {
    try {
      const { data, error } = await supabase
        .from('ably_channel_subscriptions')
        .select('*')
        .eq('is_active', false);

      if (error) throw error;

      for (const subscription of data || []) {
        await this.unsubscribeFromAbly(
          subscription.channel_name, 
          subscription.subscriber_id, 
          subscription.subscriber_type
        );
      }

    } catch (error) {
      console.error('Error cleaning up inactive subscriptions:', error);
    }
  }

  /**
   * Get subscription statistics
   */
  async getStats() {
    try {
      const { data, error } = await supabase
        .from('ably_channel_subscriptions')
        .select('channel_type, is_active')
        .eq('is_active', true);

      if (error) throw error;

      const stats = {};
      for (const subscription of data || []) {
        stats[subscription.channel_type] = (stats[subscription.channel_type] || 0) + 1;
      }

      return {
        totalActive: data?.length || 0,
        byType: stats,
        inMemory: this.activeSubscriptions.size
      };
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      return { totalActive: 0, byType: {}, inMemory: 0 };
    }
  }
}

// Export singleton instance
module.exports = new ChannelManager(); 