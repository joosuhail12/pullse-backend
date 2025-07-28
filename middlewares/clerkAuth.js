/*
// dependencies
const jose = require('jose'); // npm install jose
const fetch = require('node-fetch'); // For JWKS retrieval

// -- Clerk config --
const CLERK_JWKS_URL = 'https://crisp-gnat-74.clerk.accounts.dev/.well-known/jwks.json'; // e.g., https://clerk.yourdomain.com/.well-known/jwks.json

// 1. Cache the JWKS to avoid repeated fetches
let jwksCache = null;
let jwksFetchedAt = 0;
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

async function getClerkJWKS() {
    const now = Date.now();
    if (jwksCache && (now - jwksFetchedAt) < JWKS_CACHE_TTL) return jwksCache;
    const res = await fetch(CLERK_JWKS_URL);
    if (!res.ok) throw new Error('Failed to load Clerk JWKS');
    jwksCache = await res.json();
    jwksFetchedAt = now;
    return jwksCache;
}

// -- Clerk auth --
// JWKS + JWT verification using token destructuring fron clerk token

async function verifyUserClerkJWT(token) {
    try {
        // 2. Load Clerk JWKS for public keys
        const jwks = await getClerkJWKS();

        // 3. Create JWKS key set
        const keyStore = jose.createRemoteJWKSet(new URL(CLERK_JWKS_URL));

        // 4. Verify the token; throws if invalid/expired
        const { payload } = await jose.jwtVerify(token, keyStore);

        // 5. Required claims from custom JWT template
        const internalUserId = payload.internal_user_id || payload.internalUserId;
        const workspaceId = payload.workspace_id || payload.workspaceId;

        if (!internalUserId || !workspaceId) {
            throw new Error("Missing required claims in Clerk JWT");
        }

        // 6. Shape the result as needed for your reducers/middleware
        return {
            id: internalUserId,
            workspaceId: workspaceId,
            sub: payload.sub,                 // Clerk User ID (optional)
            email: payload.email,             // Only if you included it in JWT template
            role: payload.role,               // Only if in template
            // ...add other claims as needed
        };

    } catch (err) {
        // Handle and log invalid auth
        throw new Error('Invalid or expired Clerk token: ' + err.message);
    }
}

// Pseudo-middleware for Fastify/Express
async function clerkAuthMiddleware(req, res, next) {
    try {
        const auth = req.headers.authorization;
        if (!auth?.startsWith('Bearer ')) throw new Error('Unauthorized');
        const token = auth.slice(7); // Remove 'Bearer '
        const user = await verifyUserClerkJWT(token);
        req.user = user; // Attach to request for downstream logic
        next();
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: ' + err.message });
    }
}

module.exports = {
    verifyUserClerkJWT,
    clerkAuthMiddleware
}; 

*/

// middlewares/auth.js - maintains the previous res of verifyUser legacy (directly checks clerk token)
const { verifyToken } = require('@clerk/backend');
const { createClient } = require('@supabase/supabase-js');
const errors = require('../errors'); // Your error helpers
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const verifyUserToken = async (token) => {
    if (!token) throw new errors.Unauthorized('No token provided.');

    let decoded;
    try {
        const payload = await verifyToken(token);
        decoded = payload;
    } catch (err) {
        throw new errors.Unauthorized('Invalid token.');
    }

    const clerkUserId = decoded.sub || decoded.clerkUserId; // prefer `sub`
    const internalUserId = decoded.internal_user_id;

    // Fetch user based on Clerk or internal user ID
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, fName, lName, defaultWorkspaceId, clientId')
        .eq('id', internalUserId)
        .single();

    if (userError || !user) {
        throw new errors.Unauthorized('User not found.');
    }

    // Fetch role
    const { data: permission } = await supabase
        .from('workspacePermissions')
        .select('role')
        .eq('userId', user.id)
        .eq('workspaceId', user.defaultWorkspaceId)
        .single();

    return {
        ...user,
        role: permission?.role || null,
        clerkUserId,
    };
};

module.exports = {
    verifyUserToken,
};
