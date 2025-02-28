CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX teams_id_deletedAt_idx 
ON teams (id, deletedAt);