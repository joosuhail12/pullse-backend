CREATE TABLE widgetsessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspaceId UUID NOT NULL,
    clientId UUID NOT NULL,
    widgetId UUID NOT NULL,
    domain TEXT,
    widgetVersion TEXT,
    ipAddress TEXT,
    timezone TEXT,
    ablyKey TEXT,
    token TEXT,
    contactId UUID,
    contactDeviceId UUID,
    widgetApiKey UUID,
    status widget_session_status,
    expiry TIMESTAMPTZ,
    createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deletedAt TIMESTAMPTZ,
    FOREIGN KEY (workspaceId) REFERENCES workspaces(id),
    FOREIGN KEY (clientId) REFERENCES clients(id),
    FOREIGN KEY (widgetId) REFERENCES widgets(id),
    FOREIGN KEY (contactId) REFERENCES contacts(id),
    FOREIGN KEY (contactDeviceId) REFERENCES contactdevices(id),
    FOREIGN KEY (widgetApiKey) REFERENCES widgetapis(id)
);

CREATE TYPE widget_session_status AS ENUM ('active', 'suspended', 'expired');