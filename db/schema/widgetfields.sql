CREATE TABLE widgetfields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customObjectFields UUID[],
    contactFields JSON[],
    companyFields JSON[],
    customDataFields UUID[],
    createdBy UUID NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deletedAt TIMESTAMPTZ,
    FOREIGN KEY (createdBy) REFERENCES users(id)
);