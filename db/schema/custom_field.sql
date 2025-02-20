CREATE TABLE customFields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    fieldType TEXT NOT NULL,
    placeholder TEXT,
    defaultValue TEXT,
    options TEXT[],
    isRequired BOOLEAN DEFAULT FALSE,
    visibleTo TEXT[] NOT NULL,
    entityType TEXT NOT NULL,
    entityId TEXT,
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX customFields_id_deletedAt_idx 
ON customFields (id, deletedAt);
