create table widgettheme (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    colors jsonb not null default '{
        "primary": "#9b87f5",
        "primaryForeground": "#FFFFFF",
        "background": "#FFFFFF",
        "foreground": "#1A1F2C",
        "border": "#E1E1E1",
        "userMessage": "#9b87f5",
        "userMessageText": "#FFFFFF",
        "agentMessage": "#F1F1F1",
        "agentMessageText": "#1A1F2C",
        "inputBackground": "#F9F9F9"
    }'::jsonb,    position text,
    isCompact boolean default false,
    labels jsonb not null default '{
        "welcomeTitle": "Hello there",
        "welcomeSubtitle": "How can we help you?"
    }'::jsonb,
    persona text,
    widgetId uuid not null,
    createdBy uuid not null,
    createdAt timestamp default now(),
    updatedAt timestamp default now(),
    deletedAt timestamp
)