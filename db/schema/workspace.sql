CREATE TABLE workspace (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status BOOLEAN DEFAULT TRUE,
    description TEXT,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure unique constraint similar to MongoDB index
CREATE UNIQUE INDEX workspace_id_deletedAt_idx 
ON workspace (id, deletedAt);
