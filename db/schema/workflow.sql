CREATE TABLE workflow (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    triggerNodeId UUID, -- FK to nodes.id
    workflowFolderId UUID, --FK to workflow folder
    tags TEXT[],
    status TEXT CHECK (status IN ('active', 'draft')),
    numberOfExecutions INTEGER,
    successRate FLOAT,
        clientId UUID, -- FK to clients
    workspaceId UUID, -- FK to workspace
    createdBy UUID,
    createdAt TIMESTAMPZ DEFAULT now(),
    updatedAt TIMESTAMPZ DEFAULT now(),
    deletedAt TIMESTAMPZ,
);