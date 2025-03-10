CREATE TABLE emailDomains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    description TEXT,
    clientId TEXT NOT NULL,
    workspaceId TEXT NOT NULL,
    updatedAt TIMESTAMP DEFAULT NOW(),
    createdAt TIMESTAMP DEFAULT NOW(),
    createdBy TEXT NOT NULL,
    archiveAt TIMESTAMP,
    name TEXT NOT NULL,
    mailgunRouteId TEXT,
    dnsRecords JSONB,
    isVerified BOOLEAN DEFAULT FALSE,
);

CREATE UNIQUE INDEX emailDomains_id_deletedAt_idx 
ON emailDomains (id, deletedAt);