CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fName TEXT NOT NULL,
    lName TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    defaultWorkspaceId TEXT,
    teamId TEXT,
    clientId TEXT,
    lastLoggedInAt TIMESTAMP,
    createdBy TEXT NOT NULL,
    deletedAt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure unique constraint similar to MongoDB index
CREATE UNIQUE INDEX users_id_deletedAt_idx 
ON users (id, deletedAt);

CREATE UNIQUE INDEX users_email_deletedAt_idx 
ON users (email, deletedAt);

-- Separate table for access tokens
CREATE TABLE user_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT,
    token TEXT,
    issuedAt TIMESTAMP,
    expiry TIMESTAMP,
    userAgent TEXT DEFAULT 'Unknown',
    ip TEXT DEFAULT 'NA',
    created_at TIMESTAMP DEFAULT NOW()
);
