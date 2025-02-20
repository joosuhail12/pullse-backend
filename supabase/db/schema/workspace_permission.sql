CREATE TABLE workspace_permission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    workspace_id UUID NOT NULL REFERENCES workspace(id),
    access BOOLEAN DEFAULT TRUE,
    role TEXT CHECK (role IN ('ORGANIZATION_ADMIN', 'WORKSPACE_ADMIN', 'WORKSPACE_AGENT')) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);