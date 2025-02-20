CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticketId TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    userType TEXT NOT NULL,
    visibleTo TEXT[],
    tagIds TEXT[],
    mentionIds TEXT[],
    createdBy TEXT NOT NULL,
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX conversations_id_deletedAt_idx 
ON conversations (id, deletedAt);