CREATE TABLE eventWorkflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    eventId TEXT NOT NULL,
    workflowId TEXT NOT NULL,
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX eventWorkflows_id_deletedAt_idx 
ON eventWorkflows (id, deletedAt);

CREATE UNIQUE INDEX eventWorkflows_eventId_workflowId_deletedAt_idx 
ON eventWorkflows (eventId, workflowId, deletedAt);