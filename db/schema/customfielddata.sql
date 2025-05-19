CREATE TABLE customfielddata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customfieldId UUID NOT NULL,
    data TEXT NOT NULL,
    entityType VARCHAR(10) NOT NULL CHECK (entityType IN ('contact', 'company', 'ticket')),
    ticketId UUID,
    contactId UUID,
    companyId UUID,
    workspaceId UUID NOT NULL,
    clientId UUID NOT NULL,
    createdBy UUID NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP
);