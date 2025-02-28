const _ = require("lodash");
const Promise = require("bluebird");
const { createClient } = require("@supabase/supabase-js");
const errors = require("../errors");
const BaseService = require("./BaseService");
const TicketService = require("./TicketService");
const { UserType } = require("../constants/ClientConstants");
const { MessageType } = require("../constants/TicketConstants");
const config = require("../config");

class ConversationService extends BaseService {
    constructor() {
        super();
        this.entityName = "Conversation";
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.listingFields = ["id", "message", "type", "userType", "createdBy", "createdAt", "updatedAt"];
        this.ticketInst = new TicketService();
    }

    async addMessage({ ticketId, message, type, userType, createdBy, workspaceId, clientId }) {
        try {
            let { data: ticket, error } = await this.supabase
                .from("ticket")
                .select("*")
                .eq("id", ticketId)
                .single();
            
            if (error || !ticket) {
                throw new errors.NotFound("Ticket not found.");
            }
            
            let { data, insertError } = await this.supabase
                .from("conversation")
                .insert([{ ticket_id: ticket.id, message, type, user_type: userType, created_by: createdBy, workspace_id: workspaceId, client_id: clientId }])
                .select()
                .single();
            
            if (insertError) {
                throw insertError;
            }
            
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getConversation(ticketId) {
        try {
            let { data, error } = await this.supabase
                .from("conversation")
                .select(this.listingFields.join(","))
                .eq("ticket_id", ticketId)
                .order("createdAt", { ascending: true });
            
            if (error) {
                throw error;
            }
            
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteMessage(id) {
        try {
            let { error } = await this.supabase
                .from("conversation")
                .delete()
                .eq("id", id);
            
            if (error) {
                throw error;
            }
            
            return { message: "Message deleted successfully." };
        } catch (err) {
            return this.handleError(err);
        }
    }

    handleError(err) {
        console.error("Error in ConversationService:", err);
        return Promise.reject(err);
    }
}

module.exports = ConversationService;
