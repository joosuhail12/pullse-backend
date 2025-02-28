CREATE TABLE workflow_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    match_type TEXT CHECK (match_type IN ('all', 'any')) NOT NULL,
    properties JSONB,
    position INT NOT NULL,
    status TEXT CHECK (status IN ('active', 'inactive', 'outdated')) DEFAULT 'active',
    workspace_id UUID NOT NULL REFERENCES workspace(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);