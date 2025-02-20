CREATE TABLE demoRequests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    count TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX demoRequests_id_deletedAt_idx 
ON demoRequests (id, deletedAt);

CREATE UNIQUE INDEX demoRequests_email_deletedAt_idx 
ON demoRequests (email, deletedAt);