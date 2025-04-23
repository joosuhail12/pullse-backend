
CREATE TABLE widgetfield (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widgetId UUID NOT NULL REFERENCES widget(id),
    fieldSourceType TEXT NOT NULL, -- 'customer', 'company', 'custom_field', 'custom_object_field'
    standardFieldName TEXT NULL, -- For standard fields (e.g., 'name', 'email')
    label TEXT NULL, -- For standard fields label
    placeholder TEXT NULL, -- For standard fields placeholder in form 
    customFieldId UUID NULL, -- Reference to customFields.id
    customObjectId UUID NULL, -- Reference to customObjects.id
    customObjectFieldId UUID NULL, -- Reference to customObjectFields.id
    position INTEGER NOT NULL, -- Controls order in the form
    isRequired BOOLEAN DEFAULT FALSE, -- Whether field is mandatory
    workspaceId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    createdBy  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deletedAt  TIMESTAMPTZ DEFAULT NULL,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
);