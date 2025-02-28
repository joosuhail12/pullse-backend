CREATE TABLE workflow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    summary TEXT,
    description TEXT,
    rule_ids UUID[],
    operator TEXT CHECK (operator IN ('and', 'or')) DEFAULT 'and',
    action_ids UUID[],
    position INT NOT NULL,
    status TEXT CHECK (status IN ('draft', 'active', 'inactive', 'outdated')) DEFAULT 'active',
    last_updated_by UUID REFERENCES users(id),
    affected_tickets_count INT DEFAULT 0,
    workspace_id UUID NOT NULL REFERENCES workspace(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);