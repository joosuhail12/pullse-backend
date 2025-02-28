CREATE TABLE chatbotDocuments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT,
    link TEXT,
    filePath TEXT,
    fileMD5 TEXT,
    chatbotIds TEXT[],
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX chatbotDocuments_id_deletedAt_idx 
ON chatbotDocuments (id, deletedAt);