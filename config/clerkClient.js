const { createClerkClient } = require('@clerk/backend');

if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY is required but not set in environment variables');
}

const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY
});

module.exports = clerkClient; 