CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    summary TEXT,
    description TEXT,
    ruleIds TEXT[] NOT NULL,
    operator TEXT CHECK (operator IN ('and', 'or')) DEFAULT 'and',
    actionIds TEXT[],
    position INT NOT NULL,
    status TEXT CHECK (status IN ('draft', 'active', 'inactive', 'outdated')) DEFAULT 'active',
    lastUpdatedBy TEXT,
    affectedTicketsCount INT DEFAULT 0,
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX workflows_id_deletedAt_idx 
ON workflows (id, deletedAt);