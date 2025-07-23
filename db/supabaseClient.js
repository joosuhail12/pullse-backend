const { createClient } = require('@supabase/supabase-js');
const WorkflowService = require("../services/WorkflowService");
const NotificationService = require("../services/NotificationService");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const workflowService = new WorkflowService();
const notificationService = NotificationService.getInstance();

const newTicketChannel = supabase
    .channel('new-ticket-channel')
    .on(
        'postgres_changes',
        {
            event: 'insert',
            schema: 'public',
            table: 'tickets',
        },
        (payload) => {
            workflowService.handleNewTicket(payload);
        }
    )
    .subscribe()

const newConversationChannel = supabase
    .channel('new-conversation-channel')
    .on(
        'postgres_changes',
        {
            event: 'insert',
            schema: 'public',
            table: 'conversations',
        },
        (payload) => {
            if (payload.new.isNoteAdded) {
                workflowService.handleNewNoteAddedToConversation(payload);
            } else {
                workflowService.handleNewConversation(payload);
            }
        }
    )
    .subscribe();

const updateTicketChannel = supabase
    .channel('update-ticket-channel')
    .on(
        'postgres_changes',
        {
            event: 'update',
            schema: 'public',
            table: 'tickets',
        },
        (payload) => {
            // Check number of fields changed if its only assignedTo field changed then handle ticket reassigned otherwise trigger both workflows
            const dataChanged = Object.keys(payload.new).filter(key => payload.new[key] !== payload.old[key]);
            if (dataChanged.length === 1 && dataChanged[0] === 'assignedTo') {
                workflowService.handleTicketReassigned(payload);
                if (payload.new.channel === "chat") {
                    // Chat ticket is reassigned, so we need to update the conversation
                    workflowService.handleChatTicketReassigned(payload);
                    notificationService.handleTicketAssignedToUser(payload.new.assignedTo);
                }
            } else if (dataChanged.length > 1 && dataChanged.includes('assignedTo')) {
                workflowService.handleTicketReassigned(payload);
                notificationService.handleTicketAssignedToUser(payload.new.assignedTo);
                workflowService.handleTicketDataChanged(payload);
            } else {
                workflowService.handleTicketDataChanged(payload);
            }
        }
    )
    .subscribe();


const updateCustomFieldDataChannel = supabase
    .channel('update-custom-field-data-channel')
    .on(
        'postgres_changes',
        {
            event: 'update',
            schema: 'public',
            table: 'customfielddata',
        },
        (payload) => {
            workflowService.handleCustomFieldDataChanged(payload);
        }
    )
    .subscribe();

const updateCustomObjectFieldDataChannel = supabase
    .channel('update-custom-object-field-data-channel')
    .on(
        'postgres_changes',
        {
            event: 'update',
            schema: 'public',
            table: 'customobjectfielddata',
        },
        (payload) => {
            workflowService.handleCustomObjectFieldDataChanged(payload);
        }
    )
    .subscribe();

const updateContactChannel = supabase
    .channel('update-contact-channel')
    .on(
        'postgres_changes',
        {
            event: 'update',
            schema: 'public',
            table: 'customers',
        },
        (payload) => {
            workflowService.handleCustomerDataChanged(payload);
        }
    )
    .subscribe();

const updateCompanyChannel = supabase
    .channel('update-company-channel')
    .on(
        'postgres_changes',
        {
            event: 'update',
            schema: 'public',
            table: 'companies',
        },
        (payload) => {
            workflowService.handleCompanyDataChanged(payload);
        }
    )
    .subscribe();

module.exports = supabase;
