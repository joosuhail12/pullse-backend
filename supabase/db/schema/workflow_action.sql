CREATE TABLE workflow_action (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    position INT NOT NULL,
    type TEXT NOT NULL,
    attributes JSONB,
    custom_attributes JSONB,
    field_name TEXT,
    field_value TEXT,
    additional_data JSONB,
    workspace_id UUID NOT NULL REFERENCES workspace(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);