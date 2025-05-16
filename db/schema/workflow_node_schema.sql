CREATE TABLE workflownodeschema (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nodeType workflownode_types NOT NULL,
    type text NOT NULL, -- live or draft
    schema jsonb NOT NULL,
    schemaVersion int2 NOT NULL,
    createdAt timestamp with time zone DEFAULT now()
);
