CREATE TYPE entiryType AS ENUM ('ticket', 'contact', 'company');
CREATE TYPE field_type AS ENUM ('text', 'number', 'date', 'boolean', 'select', 'multiselect', 'url', 'email');

CREATE TABLE customfielddefinition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,  -- User-facing name (e.g., "Priority Level")
    description TEXT,
    workspaceId UUID NOT NULL,
    clientId UUID NOT NULL,
    options JSONB,  -- For select/multiselect field options
    fieldtype fieldType NOT NULL,
    entirytype entiryType NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    options JSONB,  -- For select/multiselect field options
    createdBy TEXT NOT NULL,
    archiveAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);