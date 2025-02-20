CREATE TABLE userTokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('passwordReset', 'emailVerification')),
    token TEXT NOT NULL,
    expiresAt TIMESTAMP DEFAULT (NOW() + INTERVAL '3 hours'),
    userId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    usedAt TIMESTAMP,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX userTokens_id_deletedAt_idx 
ON userTokens (id, deletedAt);