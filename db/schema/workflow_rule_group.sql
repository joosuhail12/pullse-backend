CREATE TABLE workflowrulegroup (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workflowId uuid NOT NULL,
    operator workflowruleoperator_types NOT NULL,
    parentGroupId uuid,
    createdBy uuid NOT NULL,
    createdAt timestamptz DEFAULT now(),
    deletedAt timestamptz,
);

