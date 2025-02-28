CREATE TABLE chatbots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    assistantId TEXT NOT NULL,
    channels TEXT[] NOT NULL,
    audience TEXT[] NOT NULL,
    ruleIds TEXT[],
    introMessages TEXT[],
    answerMode TEXT CHECK (answerMode IN ('once', 'loop')),
    afterAnswer TEXT CHECK (afterAnswer IN ('close', 'route')),
    ifCantAnswer TEXT CHECK (ifCantAnswer IN ('close', 'route')),
    handoverMessages TEXT[],
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX chatbots_id_deletedAt_idx 
ON chatbots (id, deletedAt);