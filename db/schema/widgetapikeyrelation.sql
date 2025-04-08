create table widgetapikeyrelation (
    id uuid primary key default gen_random_uuid(),
    apiKey uuid not null,
    widgetId uuid not null,
    createdBy uuid not null,
    createdAt timestamp default now(),
    updatedAt timestamp default now(),
    deletedAt timestamp
)