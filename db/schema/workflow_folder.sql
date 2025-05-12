CREATE TABLE workflowFolder (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    clientId UUID, -- FK to clients
    workspaceId UUID, -- FK to workspace
    createdBy UUID, -- FK to user
    createdAt TIMESTAMPZ DEFAULT now(),
    updatedAt TIMESTAMPZ DEFAULT now(),
    deletedAt TIMESTAMPZ,
);