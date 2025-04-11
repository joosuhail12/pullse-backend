CREATE TABLE ticket_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticketId UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    userId UUID NOT NULL REFERENCES users(id),
    content TEXT,
    mentionedAt TIMESTAMP DEFAULT NOW(),
    mentionedBy UUID REFERENCES users(id) ON DELETE SET NULL,
    isRead BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_ticket_mentions_ticket FOREIGN KEY(ticketId) REFERENCES tickets(id),
    CONSTRAINT fk_ticket_mentions_user FOREIGN KEY(userId) REFERENCES users(id),
    CONSTRAINT fk_ticket_mentions_mentioner FOREIGN KEY(mentionedBy) REFERENCES users(id)
);

CREATE INDEX ticket_mentions_ticket_idx ON ticket_mentions(ticketId);
CREATE INDEX ticket_mentions_user_idx ON ticket_mentions(userId);
CREATE INDEX ticket_mentions_mentioner_idx ON ticket_mentions(mentionedBy); 