CREATE TABLE emailTemplates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    event TEXT,
    description TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX emailTemplates_id_deletedAt_idx 
ON emailTemplates (id, deletedAt);