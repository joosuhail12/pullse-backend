CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT,
    workPhone TEXT,
    phone TEXT,
    phoneCountry TEXT,
    externalId TEXT,
    twitter TEXT,
    linkedin TEXT,
    timezone TEXT,
    language TEXT,
    address TEXT,
    about TEXT,
    notes TEXT,
    tagIds TEXT[],
    companyId TEXT,
    customFields JSONB,
    sessions JSONB,
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    lastActiveAt TEXT,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX customers_id_deletedAt_idx 
ON customers (id, deletedAt);