CREATE TABLE ticket_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('customer', 'back-office', 'tracker')) NOT NULL,
    customer_sharing TEXT CHECK (customer_sharing IN ('NA', 'available')) DEFAULT 'NA',
    description TEXT,
    workspace_id UUID NOT NULL REFERENCES workspace(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    created_by UUID NOT NULL REFERENCES users(id),
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);