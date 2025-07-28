Pullse AI NodeJS Base Framework


node .\seeder\role-seeder.js
node .\seeder\user-seeder.js

node .\server.js


setup:
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq

## Clerk JWT claims

Authentication now relies solely on Clerk session tokens. Configure your JWT template in the Clerk dashboard to include the following claims:

- `internal_user_id`
- `workspace_id`
- `role`
- `permissions` (optional)

These claims allow the backend to authorize requests without additional database lookups.

### Token verification

The `verifyUserToken` middleware simply calls `@clerk/backend`'s `verifyToken` and
extracts the `internal_user_id`, `workspace_id` and `role` claims. If any of these
are missing the request is rejected with a 401 error.
