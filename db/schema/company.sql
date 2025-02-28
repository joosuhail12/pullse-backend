CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    phone TEXT,
    numberOfEmployees INT,
    annualRevenue NUMERIC,
    websites TEXT[],
    notes TEXT,
    tagIds TEXT[],
    accountTier TEXT,
    industry TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zipcode TEXT,
    country TEXT,
    customFields JSONB,
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX companies_id_deletedAt_idx 
ON companies (id, deletedAt);