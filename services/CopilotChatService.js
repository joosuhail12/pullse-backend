const errors = require("../errors");
const BaseService = require("./BaseService");
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class CopilotChatService extends BaseService {
    constructor() {
        super();
        this.supabase = supabase;
        this.entityName = "copilot_conversations";
    }

    async createConversation(data) {
        try {
          // build the payload with the right field names
          const payload = {
            title: data.title,
            created_by: data.createdBy,       // note CamelCase in your input
            client_id:   data.clientId,
            workspace_id:data.workspaceId,
          };
          const initialMessage = data.initialMessage;
          // 1) load the teamMember row, embedding the team relation
          const { data: team, error: teamError } = await supabase
            .from("teams")
            .select("id, name")
            .eq("name", "Test 30 and 31")
            .single();
                
          if (teamError) throw teamError;
          if (!team) throw new errors.NotFoundError("No matching team found");
          const teamId = team.id;
      
          // 2) fetch the copilot_profile via OR between teammate_id and team_id
          //    Supabase .or() wants a comma-separated list of filter expressions:
          const orFilter = `teammate_id.eq.${data.userId},team_id.eq.${teamId}`;
          const { data: profiles, error: profErr } = await this.supabase
            .from("copilot_profiles")
            .select("id")
            .or(orFilter)
            .limit(1);
      
          if (profErr) throw profErr;
          if (!profiles.length) throw new errors.NotFoundError("No matching copilot_profile found");
      
          payload.copilot_profile_id = profiles[0].id;
          const { data: inserted, error: insertErr } = await this.supabase
            .from(this.entityName)
            .insert({
                title:        data.title,
                created_by:   data.createdBy,
                client_id:    data.clientId,
                workspace_id: data.workspaceId,
                copilot_profile_id: profiles[0].id
            })
            .select()
            .single();

            if (insertErr) throw insertErr;
            const conversation = inserted;
            const {data: message, error: messageError} = await this.supabase
            .from('copilot_conversation_messages')
            .insert({
                copilot_conversation_id: conversation.id,
                sequence: 1,
                sender_id: data.createdBy,
                content: initialMessage.content,
                message_type: initialMessage.type === 'message' ? 'text' : initialMessage.type,
                is_ai: false,
                sequence: 1,
            })
            .select()
            .single();
            if (messageError) throw messageError;
            require('../ablyServices/listeners').publishToCopilotConversationChannels(message.content, conversation.id);
            const responseData = {
                createdAt: conversation.created_at,
                updatedAt: conversation.updated_at,
                title: conversation.title,
                id: conversation.id,
                messages: [
                    {
                      id: message.id,
                      type: message.message_type,
                      content: message.content,
                      sender: {
                        id: message.sender_id,
                        name: message.sender_name
                      },
                      timestamp: message.created_at,
                      isAI: message.is_ai,
                      createdAt: message.created_at,
                      status: 'delivered'
                    },
                  ]
            }
            return responseData;
        } catch (err) {
            return this.handleError(err);
        }
      }      

      async getConversation(query) {
        try {
            const { data: conversation, error: conversationError } = await this.supabase
            .from(this.entityName)
            .select("*, users:created_by(*)")
            .eq("id", query.id)
            .single();
            if (conversationError) throw conversationError;
            const { data: message, error: messageError } = await this.supabase
            .from('copilot_conversation_messages')
            .select("*")
            .eq("copilot_conversation_id", conversation.id)
            .limit(10)
            .order('created_at', { ascending: true });
            if (messageError) throw messageError;
            const responseData = {
                createdAt: conversation.created_at,
                updatedAt: conversation.updated_at,
                title: conversation.title,
                id: conversation.id,
                messages: message.map(m => ({
                    id: m.id,
                      type: m.message_type === 'message' ? 'text' : m.message_type,
                      content: m.content,
                      sender: {
                        id: conversation.created_by.id,
                        name: conversation.created_by.name
                      },
                      timestamp: m.created_at,
                      isAI: m.is_ai,
                      createdAt: m.created_at,
                      status: 'delivered'
                    }))
            }
            return responseData;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async createMessage(data, query) {
        try {
            const { data: conversation, error: conversationError } = await this.supabase
            .from(this.entityName)
            .select("*")
            .eq("id", query.id)
            .single();
            if (conversationError) throw conversationError;
            const { data: message, error: messageError } = await this.supabase
            .from('copilot_conversation_messages')
            .insert({
                copilot_conversation_id: conversation.id,
                sequence: 1,
                sender_id: query.createdBy,
                content: data.content,
                message_type: data.type === 'message' ? 'text' : data.type,
                is_ai: false,
                sequence: 1,
            })
            .select()
            .single();
            if (messageError) throw messageError;
            require('../ablyServices/listeners').publishToCopilotConversationChannels(message.content, conversation.id); 
            const responseData = {
                id: message.id,
                type: message.message_type === 'message' ? 'text' : message.message_type,
                content: message.content,
                sender: {
                    id: message.sender_id,
                    name: message.sender_name
                },
                timestamp: message.created_at,
                isAI: message.is_ai,
                createdAt: message.created_at,
                status: 'delivered'
            }
            return responseData;
        } catch (err) {
            return this.handleError(err);
        }
    }

}

module.exports = CopilotChatService;