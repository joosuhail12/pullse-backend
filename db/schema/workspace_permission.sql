CREATE TABLE workspacePermissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    workspaceId TEXT NOT NULL,
    access BOOLEAN DEFAULT TRUE,
    role TEXT NOT NULL CHECK (role IN ('ORGANIZATION_ADMIN', 'WORKSPACE_ADMIN', 'WORKSPACE_AGENT')),
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX workspacePermissions_id_deletedAt_idx 
ON workspacePermissions (id, deletedAt);