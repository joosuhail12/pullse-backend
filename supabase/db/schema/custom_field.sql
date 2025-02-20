CREATE TABLE custom_field (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'checkbox', 'radio', 'textarea', 'multiselect')),
    placeholder TEXT,
    default_value TEXT,
    options TEXT[],
    is_required BOOLEAN DEFAULT FALSE,
    visible_to TEXT[],
    entity_type TEXT NOT NULL,
    entity_id UUID,
    workspace_id UUID NOT NULL REFERENCES workspace(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);