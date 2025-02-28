CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    secret UUID NOT NULL DEFAULT gen_random_uuid(),
    ownerId TEXT,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX clients_id_deletedAt_idx 
ON clients (id, deletedAt);