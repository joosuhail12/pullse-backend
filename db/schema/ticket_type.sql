CREATE TABLE ticketType (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('customer', 'back-office', 'tracker')),
    customerSharing TEXT CHECK (customerSharing IN ('NA', 'available')) DEFAULT 'NA',
    description TEXT,
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX ticketType_id_deletedAt_idx 
ON ticketType (id, deletedAt);