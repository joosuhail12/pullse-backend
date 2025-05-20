CREATE TABLE workflowrule (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workflowId uuid NOT NULL,
    workflowRuleGroupId uuid NOT NULL,
    entityType workflowruleentity_types NOT NULL,
    standardFieldName text,
    customFieldId uuid,
    customObjectId uuid,
    customObjectFieldId uuid,
    operator workflowrulesoperater_types NOT NULL,
    value text,
    sourceFieldType text,
    createdAt timestamptz DEFAULT now(),
    deletedAt timestamptz
);