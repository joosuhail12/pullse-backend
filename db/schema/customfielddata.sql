CREATE TABLE customfielddata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customfieldId UUID NOT NULL,
    data TEXT NOT NULL,
    entityType ENUM('contact', 'company', 'ticket') NOT NULL,
    ticketId UUID,
    contactId UUID,
    companyId UUID,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP,
);