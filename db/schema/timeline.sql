CREATE TABLE timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entity Information
    entity_type TEXT NOT NULL CHECK (entity_type IN ('contact', 'company', 'ticket')),
    entity_id UUID NOT NULL,
    
    -- Activity Classification
    activity_type TEXT NOT NULL CHECK (activity_type IN ('email', 'ticket', 'note', 'call', 'meeting', 'company_update', 'contact_update', 'system')),
    activity_subtype TEXT, -- e.g., 'sent', 'received', 'created', 'updated', 'closed'
    
    -- Activity Details
    title TEXT NOT NULL,
    description TEXT,
    summary TEXT, -- Brief one-line summary for timeline display
    
    -- Relations to actual records
    related_ticket_id UUID,
    related_email_id UUID,
    related_note_id UUID,
    related_call_id UUID,
    related_meeting_id UUID,
    related_conversation_id UUID,
    
    -- Change Tracking (for updates)
    field_changed TEXT,
    old_value JSONB,
    new_value JSONB,
    changes_summary TEXT, -- Human readable summary of changes
    
    -- User Context
    actor_id UUID, -- Who performed the action
    actor_name TEXT,
    actor_type TEXT CHECK (actor_type IN ('user', 'customer', 'system', 'automation')),
    actor_email TEXT,
    
    -- Organizational Context (for fast queries)
    workspace_id UUID NOT NULL REFERENCES workspace(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    
    -- Metadata
    source TEXT DEFAULT 'system' CHECK (source IN ('web', 'mobile', 'api', 'email', 'phone', 'chat', 'system', 'automation')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_internal BOOLEAN DEFAULT false, -- Internal notes vs customer-facing activities
    
    -- Response time tracking (for emails, tickets)
    response_time_minutes INTEGER,
    
    -- Timestamps
    activity_date TIMESTAMP DEFAULT NOW(), -- When the actual activity happened
    created_at TIMESTAMP DEFAULT NOW(),   -- When this timeline entry was created
    
    -- Soft delete
    deleted_at TIMESTAMP
);

-- Core indexes for performance
CREATE INDEX idx_timeline_entity_activity ON timeline (entity_type, entity_id, activity_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_timeline_workspace_client ON timeline (workspace_id, client_id, activity_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_timeline_activity_type ON timeline (activity_type, activity_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_timeline_actor ON timeline (actor_id, activity_date DESC) WHERE deleted_at IS NULL;

-- Composite indexes for common filtered queries
CREATE INDEX idx_timeline_entity_type_filter ON timeline (entity_type, entity_id, activity_type, activity_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_timeline_workspace_type_filter ON timeline (workspace_id, client_id, activity_type, activity_date DESC) WHERE deleted_at IS NULL;

-- Indexes on related record IDs for quick lookups
CREATE INDEX idx_timeline_related_ticket ON timeline (related_ticket_id) WHERE related_ticket_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_timeline_related_email ON timeline (related_email_id) WHERE related_email_id IS NOT NULL AND deleted_at IS NULL; 