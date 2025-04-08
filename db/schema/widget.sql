create table widget (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    clientId uuid not null,
    workspaceId uuid not null,
    createdBy uuid not null,
    createdAt timestamp default now(),
    updatedAt timestamp default now(),
    deletedAt timestamp
)