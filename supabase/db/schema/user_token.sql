CREATE TABLE user_token (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('passwordReset', 'emailVerification')),
    token TEXT NOT NULL,
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '3 hours',
    user_id UUID NOT NULL REFERENCES users(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    used_at TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
