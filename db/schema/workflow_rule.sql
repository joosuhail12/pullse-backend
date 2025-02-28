CREATE TABLE workflowRules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    matchType TEXT NOT NULL CHECK (matchType IN ('all', 'any')),
    properties JSONB,
    position INT NOT NULL,
    status TEXT CHECK (status IN ('active', 'inactive', 'outdated')) DEFAULT 'active',
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX workflowRules_id_deletedAt_idx 
ON workflowRules (id, deletedAt);