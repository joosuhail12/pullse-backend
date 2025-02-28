CREATE TABLE emailDomains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    description TEXT,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX emailDomains_id_deletedAt_idx 
ON emailDomains (id, deletedAt);