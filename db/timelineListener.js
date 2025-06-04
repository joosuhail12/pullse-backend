const { createClient } = require('@supabase/supabase-js');
const TimelineService = require("../services/TimelineService");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

class TimelineListener {
    constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        this.timelineService = new TimelineService();
        this.channels = [];
    }

    /**
     * Initialize all timeline-related real-time listeners
     */
    init() {
        this.initTicketTimeline();
        this.initContactTimeline();
        this.initCompanyTimeline();
        console.log('✅ Timeline listeners initialized');
    }

    /**
     * Initialize ticket timeline listeners
     */
    initTicketTimeline() {
        const ticketChannel = this.supabase
            .channel('timeline-ticket-events')
            .on('postgres_changes', { event: 'insert', schema: 'public', table: 'tickets' }, async (payload) => {
                try {
                    const ticket = payload.new;
                    if (ticket.customerId && ticket.workspaceId && ticket.clientId) {
                        await this.timelineService.logTicketActivity('contact', ticket.customerId, {
                            action: 'created',
                            ticket_number: ticket.sno,
                            ticket_id: ticket.id,
                            description: ticket.title,
                            actor_id: ticket.createdBy || null, // Fixed: null instead of 'system'
                            actor_name: ticket.ticketCreatedBy || 'System',
                            source: 'system'
                        }, ticket.workspaceId, ticket.clientId);
                        console.log('📝 Timeline: Ticket created logged');
                    }
                } catch (error) {
                    console.error('❌ Timeline: Error handling ticket insert:', error);
                }
            })
            .on('postgres_changes', { event: 'update', schema: 'public', table: 'tickets' }, async (payload) => {
                try {
                    console.log('ticket updated', payload);
                    const oldTicket = payload.old;
                    const newTicket = payload.new;
                    const changes = TimelineService.trackChanges(oldTicket, newTicket, ['status', 'assigneeId', 'priority', 'title']);
                    console.log('changes', changes);
                    if (changes && newTicket.customerId && newTicket.workspaceId && newTicket.clientId) {
                        await this.timelineService.logTicketActivity('contact', newTicket.customerId, { // first 2 params are entity type and entity id - faulty here 
                            action: 'updated',
                            ticket_number: newTicket.sno,
                            ticket_id: newTicket.id,
                            changes_summary: Object.keys(changes).join(', '),
                            actor_id: newTicket.updatedBy || null, // Fixed: null instead of 'system'
                            actor_name: 'System',
                            source: 'system'
                        }, newTicket.workspaceId, newTicket.clientId);
                        console.log('📝 Timeline: Ticket update logged -', Object.keys(changes).join(', '));
                    }
                } catch (error) {
                    console.error('❌ Timeline: Error handling ticket update:', error);
                }
            })
            .subscribe();

        this.channels.push(ticketChannel);
    }

    /**
     * Initialize contact/customer timeline listeners
     */
    initContactTimeline() {
        const contactChannel = this.supabase
            .channel('timeline-contact-events')
            .on('postgres_changes', { event: 'insert', schema: 'public', table: 'customers' }, async (payload) => {
                try {
                    const customer = payload.new;
                    if (customer.id && customer.workspaceId && customer.clientId) {
                        await this.timelineService.logEntityCreated(
                            'contact',
                            customer.id,
                            customer.workspaceId,
                            customer.clientId,
                            customer.createdBy || null, // Fixed: null instead of 'system'
                            (customer.firstName || '') + ' ' + (customer.lastName || '')
                        );
                        console.log('📝 Timeline: Contact created logged');
                    }
                } catch (error) {
                    console.error('❌ Timeline: Error handling customer insert:', error);
                }
            })
            .on('postgres_changes', { event: 'update', schema: 'public', table: 'customers' }, async (payload) => {
                try {
                    const oldCustomer = payload.old;
                    const newCustomer = payload.new;
                    const changes = TimelineService.trackChanges(oldCustomer, newCustomer, ['firstName', 'lastName', 'email', 'phone', 'status', 'title']);

                    if (changes && newCustomer.id && newCustomer.workspaceId && newCustomer.clientId) {
                        await this.timelineService.logEntityUpdated(
                            'contact',
                            newCustomer.id,
                            changes,
                            newCustomer.workspaceId,
                            newCustomer.clientId,
                            newCustomer.updatedBy || null, // Fixed: null instead of 'system'
                            'System'
                        );
                        console.log('📝 Timeline: Contact update logged -', Object.keys(changes).join(', '));
                    }
                } catch (error) {
                    console.error('❌ Timeline: Error handling customer update:', error);
                }
            })
            .subscribe();

        this.channels.push(contactChannel);
    }

    /**
     * Initialize company timeline listeners
     */
    initCompanyTimeline() {
        const companyChannel = this.supabase
            .channel('timeline-company-events')
            .on('postgres_changes', { event: 'insert', schema: 'public', table: 'company' }, async (payload) => {
                try {
                    const company = payload.new;
                    if (company.id && company.workspaceId && company.clientId) {
                        await this.timelineService.logEntityCreated(
                            'company',
                            company.id,
                            company.workspaceId,
                            company.clientId,
                            company.createdBy || null, // Fixed: null instead of 'system'
                            company.name || 'Company'
                        );
                        console.log('📝 Timeline: Company created logged');
                    }
                } catch (error) {
                    console.error('❌ Timeline: Error handling company insert:', error);
                }
            })
            .on('postgres_changes', { event: 'update', schema: 'public', table: 'company' }, async (payload) => {
                try {
                    const oldCompany = payload.old;
                    const newCompany = payload.new;
                    const changes = TimelineService.trackChanges(oldCompany, newCompany, ['name', 'industry', 'size', 'status']);

                    if (changes && newCompany.id && newCompany.workspaceId && newCompany.clientId) {
                        await this.timelineService.logEntityUpdated(
                            'company',
                            newCompany.id,
                            changes,
                            newCompany.workspaceId,
                            newCompany.clientId,
                            newCompany.updatedBy || null, // Fixed: null instead of 'system'
                            'System'
                        );
                        console.log('📝 Timeline: Company update logged -', Object.keys(changes).join(', '));
                    }
                } catch (error) {
                    console.error('❌ Timeline: Error handling company update:', error);
                }
            })
            .subscribe();

        this.channels.push(companyChannel);
    }

    /**
     * Cleanup all timeline listeners
     */
    cleanup() {
        this.channels.forEach(channel => {
            channel.unsubscribe();
        });
        this.channels = [];
        console.log('🧹 Timeline listeners cleaned up');
    }

    /**
     * Get timeline service instance for manual logging
     */
    getTimelineService() {
        return this.timelineService;
    }
}

module.exports = TimelineListener; 