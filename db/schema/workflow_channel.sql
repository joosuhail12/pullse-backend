CREATE TABLE workflowchannel (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workflowId uuid NOT NULL,
    channelType workflowchannel_types NOT NULL,
    widgetId uuid,
    emailChannelId uuid,
    createdAt timestamptz DEFAULT now(),
    deletedAt timestamptz
);