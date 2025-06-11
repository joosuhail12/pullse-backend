const { createClient } = require('@supabase/supabase-js');
const TimelineService = require("../services/TimelineService");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

class TimelineListener {
    constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        this.timelineService = new TimelineService();
        this.channels = [];
        this.instanceId = `TLI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🚀 DEBUG: TimelineListener instance created with ID: ${this.instanceId}`);
    }

    /**
     * Initialize all timeline-related real-time listeners
     */
    init() {
        console.log(`🚀 DEBUG: Initializing TimelineListener instance: ${this.instanceId}`);
        this.initTicketTimeline();
        this.initContactTimeline();
        this.initCompanyTimeline();
        this.initTagTimeline();
        this.initSentimentTimeline();
        console.log(`✅ Timeline listeners initialized for instance: ${this.instanceId}`);
    }

    /**
     * Initialize ticket timeline listeners
     */
    initTicketTimeline() {
        const ticketChannel = this.supabase
            .channel(`timeline-ticket-events-${this.instanceId}`)
            .on('postgres_changes', { event: 'insert', schema: 'public', table: 'tickets' }, async (payload) => {
                console.log(`🔧 DEBUG [${this.instanceId}]: Ticket INSERT event triggered`);
                try {
                    const ticket = payload.new;
                    console.log(`🔧 DEBUG [${this.instanceId}]: Ticket data:`, ticket);
                    if (ticket.customerId && ticket.workspaceId && ticket.clientId) {
                        await this.timelineService.logTicketActivity('contact', ticket.customerId, {
                            action: 'created',
                            ticket_number: ticket.sno,
                            ticket_id: ticket.id,
                            description: ticket.title,
                            actor_id: ticket.createdBy || null,
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
                    const oldTicket = payload.old;
                    const newTicket = payload.new;

                    // Use detailed change tracking
                    const changeResult = TimelineService.trackDetailedChanges(
                        oldTicket,
                        newTicket,
                        ['status', 'assigneeId', 'priority', 'title', 'description', 'sentiment']
                    );

                    if (changeResult.changes && newTicket.customerId && newTicket.workspaceId && newTicket.clientId) {
                        await this.timelineService.logTicketActivity('contact', newTicket.customerId, {
                            action: 'updated',
                            ticket_number: newTicket.sno,
                            ticket_id: newTicket.id,
                            changes_summary: changeResult.summary,
                            field_changed: changeResult.fieldsChanged.join(', '),
                            old_value: changeResult.changeData,
                            new_value: changeResult.changeData,
                            actor_id: newTicket.updatedBy || null,
                            actor_name: null,
                            source: 'system'
                        }, newTicket.workspaceId, newTicket.clientId);
                        console.log('📝 Timeline: Ticket update logged -', changeResult.summary);

                        // Log sentiment changes separately if present
                        if (changeResult.changes.sentiment) {
                            await this.timelineService.logSentimentActivity('contact', newTicket.customerId, {
                                old_sentiment: changeResult.changes.sentiment.old,
                                new_sentiment: changeResult.changes.sentiment.new,
                                ticket_id: newTicket.id,
                                actor_id: newTicket.updatedBy || null,
                                actor_name: null
                            }, newTicket.workspaceId, newTicket.clientId);
                            console.log('📊 Timeline: Sentiment change logged');
                        }
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
        console.log(`🔧 DEBUG [${this.instanceId}]: Initializing contact timeline listeners`);

        const contactChannel = this.supabase
            .channel(`timeline-contact-events-${this.instanceId}`) // Make channel name unique per instance
            .on('postgres_changes', { event: 'insert', schema: 'public', table: 'customers' }, async (payload) => {
                try {
                    console.log(`📝 DEBUG [${this.instanceId}]: Contact INSERT event triggered`);
                    const customer = payload.new;
                    if (customer.id && customer.workspaceId && customer.clientId) {
                        await this.timelineService.logEntityCreated(
                            'contact',
                            customer.id,
                            customer.workspaceId,
                            customer.clientId,
                            customer.createdBy || null,
                            (customer.firstname || '') + ' ' + (customer.lastname || '')
                        );
                        console.log('📝 Timeline: Contact created logged');
                    }
                } catch (error) {
                    console.error('❌ Timeline: Error handling customer insert:', error);
                }
            })
            .on('postgres_changes', { event: 'update', schema: 'public', table: 'customers' }, async (payload) => {
                try {
                    console.log(`📝 DEBUG [${this.instanceId}]: Contact UPDATE event triggered`);
                    const oldCustomer = payload.old;
                    const newCustomer = payload.new;

                    console.log('🔍 DEBUG: Customer update detected:', {
                        instanceId: this.instanceId,
                        customerId: newCustomer.id,
                        oldData: Object.keys(oldCustomer),
                        newData: Object.keys(newCustomer),
                        timestamp: new Date().toISOString()
                    });

                    // Fixed field names to match actual database schema
                    const changeResult = TimelineService.trackDetailedChanges(
                        oldCustomer,
                        newCustomer,
                        ['firstname', 'lastname', 'email', 'phone', 'status', 'title', 'about', 'companyId', 'assignedTo']
                    );

                    console.log('🔍 DEBUG: Change result:', {
                        instanceId: this.instanceId,
                        hasChanges: !!changeResult.changes,
                        summary: changeResult.summary,
                        fieldsChanged: changeResult.fieldsChanged
                    });

                    if (changeResult.changes && newCustomer.id && newCustomer.workspaceId && newCustomer.clientId) {
                        console.log('🔍 DEBUG: About to create timeline entry with data:', {
                            instanceId: this.instanceId,
                            entityType: 'contact',
                            entityId: newCustomer.id,
                            changeData: changeResult.changeData,
                            summary: changeResult.summary
                        });

                        await this.timelineService.logEntityUpdated(
                            'contact',
                            newCustomer.id,
                            changeResult.changeData,
                            newCustomer.workspaceId,
                            newCustomer.clientId,
                            newCustomer.updatedBy || null,
                            null,
                            {
                                changes_summary: changeResult.summary
                            }
                        );
                        console.log(`📝 Timeline [${this.instanceId}]: Contact update logged -`, changeResult.summary);
                    }
                } catch (error) {
                    console.error('❌ Timeline: Error handling customer update:', error);
                }
            })
            .subscribe();

        console.log(`🔧 DEBUG [${this.instanceId}]: Contact channel subscribed`);
        this.channels.push(contactChannel);
    }

    /**
     * Initialize company timeline listeners
     */
    initCompanyTimeline() {
        console.log(`🔧 DEBUG [${this.instanceId}]: Initializing company timeline listeners`);

        const companyChannel = this.supabase
            .channel(`timeline-company-events-${this.instanceId}`) // Make channel name unique per instance
            .on('postgres_changes', { event: 'insert', schema: 'public', table: 'companies' }, async (payload) => {
                try {
                    const company = payload.new;
                    if (company.id && company.workspaceId && company.clientId) {
                        await this.timelineService.logEntityCreated(
                            'company',
                            company.id,
                            company.workspaceId,
                            company.clientId,
                            company.createdBy || null,
                            company.name || 'Company'
                        );
                        console.log('📝 Timeline: Company created logged');
                    }
                } catch (error) {
                    console.error('❌ Timeline: Error handling company insert:', error);
                }
            })
            .on('postgres_changes', { event: 'update', schema: 'public', table: 'companies' }, async (payload) => {
                try {
                    console.log(`📝 DEBUG [${this.instanceId}]: Company UPDATE event triggered`);
                    const oldCompany = payload.old;
                    const newCompany = payload.new;

                    console.log('🔍 DEBUG: Company update detected:', {
                        instanceId: this.instanceId,
                        companyId: newCompany.id,
                        oldData: Object.keys(oldCompany),
                        newData: Object.keys(newCompany),
                        timestamp: new Date().toISOString()
                    });

                    const changeResult = TimelineService.trackDetailedChanges(
                        oldCompany,
                        newCompany,
                        ['name', 'description', 'phone', 'number_of_employees', 'annual_revenue', 'website', 'notes', 'industry', 'address', 'city', 'state', 'zipcode', 'country']
                    );

                    console.log('🔍 DEBUG: Company change result:', {
                        instanceId: this.instanceId,
                        hasChanges: !!changeResult.changes,
                        summary: changeResult.summary,
                        fieldsChanged: changeResult.fieldsChanged
                    });

                    if (changeResult.changes && newCompany.id && newCompany.workspaceId && newCompany.clientId) {
                        console.log('🔍 DEBUG: About to create company timeline entry with data:', {
                            instanceId: this.instanceId,
                            entityType: 'company',
                            entityId: newCompany.id,
                            changeData: changeResult.changeData,
                            summary: changeResult.summary
                        });

                        await this.timelineService.logEntityUpdated(
                            'company',
                            newCompany.id,
                            changeResult.changeData,
                            newCompany.workspaceId,
                            newCompany.clientId,
                            newCompany.updatedBy || null,
                            null,
                            {
                                changes_summary: changeResult.summary
                            }
                        );
                        console.log(`📝 Timeline [${this.instanceId}]: Company update logged -`, changeResult.summary);
                    }
                } catch (error) {
                    console.error('❌ Timeline: Error handling company update:', error);
                }
            })
            .subscribe();

        console.log(`🔧 DEBUG [${this.instanceId}]: Company channel subscribed`);
        this.channels.push(companyChannel);
    }

    /**
     * Initialize tag timeline listeners for customer and company tags
     */
    initTagTimeline() {
        console.log(`🔧 DEBUG [${this.instanceId}]: Initializing tag timeline listeners`);

        // Customer tags listener
        const customerTagsChannel = this.supabase
            .channel(`timeline-customer-tags-${this.instanceId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customerTags' }, async (payload) => {
                try {
                    console.log(`🏷️ DEBUG [${this.instanceId}]: Customer tag change event triggered`);
                    await this.handleTagChange('contact', payload);
                } catch (error) {
                    console.error('❌ Timeline: Error handling customer tag change:', error);
                }
            })
            .subscribe();

        // Company tags listener
        const companyTagsChannel = this.supabase
            .channel(`timeline-company-tags-${this.instanceId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'companyTags' }, async (payload) => {
                try {
                    console.log(`🏷️ DEBUG [${this.instanceId}]: Company tag change event triggered`);
                    await this.handleTagChange('company', payload);
                } catch (error) {
                    console.error('❌ Timeline: Error handling company tag change:', error);
                }
            })
            .subscribe();

        console.log(`🔧 DEBUG [${this.instanceId}]: Tag channels subscribed`);
        this.channels.push(customerTagsChannel, companyTagsChannel);
    }

    /**
     * Handle tag changes (helper method for tag listeners)
     */
    async handleTagChange(entityType, payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        console.log(`🏷️ DEBUG [${this.instanceId}]: Processing ${eventType} tag change for ${entityType}`, {
            instanceId: this.instanceId,
            eventType,
            hasNewRecord: !!newRecord,
            hasOldRecord: !!oldRecord
        });

        if (eventType === 'INSERT' || eventType === 'DELETE') {
            const record = newRecord || oldRecord;
            const entityId = entityType === 'contact' ? record.customerId : record.companyId;

            if (!entityId || !record.workspaceId || !record.clientId) {
                console.log(`⚠️ DEBUG [${this.instanceId}]: Missing required fields for tag change`, {
                    entityId,
                    workspaceId: record.workspaceId,
                    clientId: record.clientId
                });
                return;
            }

            const actionDescription = eventType === 'INSERT' ? 'added' : 'removed';
            const tagName = await this.getTagName(record.tagId);

            console.log(`🏷️ DEBUG [${this.instanceId}]: About to log tag activity`, {
                entityType,
                entityId,
                actionDescription,
                tagName,
                tagId: record.tagId
            });

            await this.timelineService.logTagActivity(entityType, entityId, {
                old_tag_ids: eventType === 'INSERT' ? [] : [record.tagId],
                new_tag_ids: eventType === 'INSERT' ? [record.tagId] : [],
                added_tag_names: eventType === 'INSERT' ? [tagName] : [],
                removed_tag_names: eventType === 'DELETE' ? [tagName] : [],
                actor_id: null,
                actor_name: null,
                source: 'system'
            }, record.workspaceId, record.clientId);

            console.log(`🏷️ Timeline [${this.instanceId}]: Tag ${actionDescription} for ${entityType} - ${tagName}`);
        }
    }

    /**
     * Initialize sentiment timeline listeners
     */
    initSentimentTimeline() {
        // Listen for ticket sentiment changes through ticket updates
        // This is already handled in the ticket update listener above
        console.log('📊 Sentiment tracking initialized through ticket updates');
    }

    /**
     * Helper method to get current entity tags
     */
    async getCurrentEntityTags(entityType, entityId, workspaceId, clientId) {
        const tableName = entityType === 'contact' ? 'customerTags' : 'companyTags';
        const idField = entityType === 'contact' ? 'customerId' : 'companyId';

        const { data, error } = await this.supabase
            .from(tableName)
            .select('tagId')
            .eq(idField, entityId)
            .eq('workspaceId', workspaceId)
            .eq('clientId', clientId);

        return error ? [] : data;
    }

    /**
     * Helper method to get tag names
     */
    async getTagNames(tagIds) {
        if (!tagIds.length) return [];

        const { data, error } = await this.supabase
            .from('tags')
            .select('id, name')
            .in('id', tagIds);

        return error ? [] : data.map(tag => tag.name);
    }

    /**
     * Helper method to get single tag name
     */
    async getTagName(tagId) {
        const { data, error } = await this.supabase
            .from('tags')
            .select('name')
            .eq('id', tagId)
            .single();

        return error ? 'Unknown Tag' : data.name;
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