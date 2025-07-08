const _ = require("lodash");
const Promise = require("bluebird");
const { createClient } = require("@supabase/supabase-js");
const errors = require("../errors");
const BaseService = require("./BaseService");
const { UserType } = require("../constants/ClientConstants");
const config = require("../config");
const { Status: TicketStatus, EntityType, MessageType } = require('../constants/TicketConstants');
const ConversationEventPublisher = require("../Events/ConversationEvent/ConversationEventPublisher");

class ConversationService extends BaseService {
    constructor() {
        super();
        this.entityName = "Conversation";
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.listingFields = ["id", "message", "type", "userType", "createdBy", "createdAt", "updatedAt"];
    }

    async addMessage({ ticketId, message, type, userType, tagIds, mentionIds, createdBy, workspaceId, clientId, lastMailgunMessageId = "" }, newTicket = false) {
        try {
            let ticket;
            if (Object.keys(newTicket).length > 0) {
                if (!message) {
                    return Promise.reject(new errors.BadRequest("Message is required."));
                }

                const ticketData = {
                    title: newTicket.title || 'New Ticket',
                    description: newTicket.description,
                    ticketCreatedBy: newTicket.ticketCreatedBy,
                    customerId: newTicket.customerId ?? null,
                    channel: newTicket.channel || null,
                    emailChannelId: newTicket.emailChannelId || null,
                    sessionId: newTicket.sessionId || null,
                    device: newTicket.device,
                    clientId: clientId,
                    createdBy: createdBy,
                    workspaceId: workspaceId,
                    lastMailgunMessageId: lastMailgunMessageId,
                    mailgunReferenceIds: [lastMailgunMessageId],
                    entityType: EntityType.conversation,
                    lastMessage: message,
                    lastMessageBy: UserType.customer,
                    lastMessageAt: new Date().toISOString(),
                };

                const { data: newTicketData, error: ticketError } = await this.supabase
                    .from('tickets')
                    .insert(ticketData)
                    .select()
                    .single();

                if (ticketError && Object.keys(ticketError).length > 0) throw ticketError;
                ticket = newTicketData;

            } else {
                const { data: existingTicket, error: findError } = await this.supabase
                    .from('tickets')
                    .select('*')
                    .eq('id', ticketId)
                    .single();

                if (findError) throw findError;
                ticket = existingTicket;

                const ticketUpdate = {
                    lastMailgunMessageId: lastMailgunMessageId,
                    mailgunReferenceIds: [...(ticket.mailgunReferenceIds || []), lastMailgunMessageId],
                    lastMessage: message,
                    lastMessageAt: new Date().toISOString()
                };

                if (mentionIds) {
                    ticketUpdate.mentionIds = [...new Set([...(ticket.mentionIds || []), ...mentionIds])];
                }

                if (tagIds) {
                    ticketUpdate.tagIds = [...new Set([...(ticket.tagIds || []), ...tagIds])];
                }

                if (userType === ticket.lastMessageBy) {
                    ticketUpdate.unread = (ticket.unread || 0) + 1;
                } else {
                    ticketUpdate.lastMessageBy = userType;
                    ticketUpdate.unread = 1;
                }

                const { error: updateError } = await this.supabase
                    .from('tickets')
                    .update(ticketUpdate)
                    .eq('id', ticket.id);

                if (updateError) throw updateError;
            }

            if (!ticket) {
                return Promise.reject(new errors.NotFound("Ticket not found."));
            }

            const messageData = {
                ticketId: ticket.id,
                message,
                type,
                userType,
                createdBy,
                workspaceId,
                clientId
            };

            if ([MessageType.note, MessageType.summary, MessageType.qa].includes(type)) {
                messageData.visible_to = UserType.agent;
            }

            const { data: newMessage, error: messageError } = await this.supabase
                .from('conversations')
                .insert([messageData])
                .select()
                .single();

            if (messageError) throw messageError;

            // const { data: conversationMessage, error: convError } = await this.supabase
            //     .from('conversations')
            //     .select('*')
            //     .eq('id', newMessage.id)
            //     .single();

            // console.log(conversationMessage, "conversationMessage");

            if (messageError) throw messageError;

            let inst = new ConversationEventPublisher();
            inst.created(newMessage, ticket, !!newTicket);

            return {
                newMessage,
                ticket,
            };

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
