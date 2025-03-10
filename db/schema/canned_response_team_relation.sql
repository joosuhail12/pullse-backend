CREATE TABLE cannedresponsesteamrelation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cannedResponseId UUID NOT NULL,
    teamId UUID NOT NULL,
    typeOfSharing ENUM ('view', 'edit') DEFAULT 'view',
    archiveAt TIMESTAMP,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX cannedResponses_id_deletedAt_idx 
ON cannedResponses (id, deletedAt);