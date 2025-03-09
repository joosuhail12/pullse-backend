CREATE TABLE cannedResponses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    numberOfTimesUsed INT DEFAULT 0,
    shortcut TEXT NOT NULL,
    lastUsedAt TIMESTAMP,
    category ENUM ('greeting', 'support', 'technical', 'closing') DEFAULT 'general',
    isShared BOOLEAN DEFAULT FALSE,
    sharingType ENUM ('view', 'edit') DEFAULT 'view',
    archiveAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX cannedResponses_id_deletedAt_idx 
ON cannedResponses (id, deletedAt);