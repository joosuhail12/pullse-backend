const triggerCategories = [
    {
        category: "Customer Events",
        triggers: [
            { id: 'page_visit', name: 'Contact Visits Page', description: 'Triggered when a contact visits a page.', eventType: 'customer.page_visit' },
            { id: 'new_convo', name: 'New Conversation Started', description: 'When a contact opens a new conversation.', eventType: 'conversation.started' },
            { id: 'customer_message', name: 'Customer Sends Message', description: 'Triggered when the contact sends any message.', eventType: 'customer.message' },
            { id: 'customer_unresponsive', name: 'Contact Becomes Unresponsive', description: 'When a contact hasn’t replied in a while.', eventType: 'customer.unresponsive' }
        ]
    },
    {
        category: "Teammate Actions",
        triggers: [
            { id: 'teammate_message', name: 'Teammate Sends Message', description: 'When a teammate sends any message.', eventType: 'teammate.message' },
            { id: 'note_added', name: 'Note Added to Conversation', description: 'When a teammate adds a note.', eventType: 'conversation.note_added' },
            { id: 'assignment_change', name: 'Conversation Reassigned', description: 'When a teammate changes assignment.', eventType: 'conversation.reassigned' },
            { id: 'agent_unresponsive', name: 'Teammate Becomes Unresponsive', description: 'When a teammate hasn’t replied in a while.', eventType: 'teammate.unresponsive' },
            { id: 'data_change', name: 'Contact or Ticket Data Changed', description: 'When any field is updated.', eventType: 'data.updated' }
        ]
    },
    {
        category: "System Events",
        triggers: [
            { id: 'ticket_created', name: 'Ticket Created', description: 'When a new ticket is created in the system.', eventType: 'ticket.created', entityType: 'ticket' },
            { id: 'reusable_workflow', name: 'Reusable Workflow Triggered', description: 'Triggered by another workflow.', eventType: 'workflow.reused', entityType: 'workflow' }
        ]
    }
];

// Flatten trigger list
const allTriggers = triggerCategories.flatMap(cat =>
    cat.triggers.map(trigger => ({
        ...trigger,
        category: cat.category
    }))
);

// Maps
const triggerMap = Object.fromEntries(allTriggers.map(t => [t.id, t]));
const eventTypeMap = Object.fromEntries(allTriggers.map(t => [t.id, t.eventType]));
const entityTypeMap = Object.fromEntries(allTriggers.map(t => [t.id, t.entityType]));

module.exports = {
    triggerCategories,
    getTriggerById: (id) => triggerMap[id] || null,
    isValidTrigger: (id) => !!triggerMap[id],
    listAllTriggerIds: () => Object.keys(triggerMap),
    listAllTriggers: () => allTriggers,
    listTriggerCategories: () => triggerCategories.map(cat => cat.category),
    getEventTypeByTriggerId: (id) => eventTypeMap[id] || null,
    getEntityTypeByTriggerId: (id) => entityTypeMap[id] || null
};
