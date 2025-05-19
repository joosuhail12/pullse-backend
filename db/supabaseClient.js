const { createClient } = require('@supabase/supabase-js');
const WorkflowService = require("../services/WorkflowService");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const workflowService = new WorkflowService();

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

module.exports = supabase;
