CREATE TABLE customobjectfielddata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customObjectFieldId UUID NOT NULL,
    data TEXT NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletedAt TIMESTAMP,
);