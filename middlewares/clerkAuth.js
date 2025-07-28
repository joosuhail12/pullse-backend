const { verifyToken } = require('@clerk/backend');
const errors = require('../errors');

/**
 * Verify a Clerk session token and return the claims needed for auth.
 * This middleware relies solely on Clerk and does not query Supabase.
 */
const verifyUserToken = async (token) => {
  if (!token) throw new errors.Unauthorized('No token provided.');

  let decoded;
  try {
    decoded = await verifyToken(token);
  } catch (err) {
    throw new errors.Unauthorized('Invalid token.');
  }

  const clerkUserId = decoded.sub || decoded.clerkUserId;
  const internalUserId = decoded.internal_user_id || decoded.internalUserId;
  const workspaceId = decoded.workspace_id || decoded.workspaceId;
  const role = decoded.role;

  if (!internalUserId || !workspaceId || !role) {
    throw new errors.Unauthorized('Missing required claims.');
  }

  return {
    id: internalUserId,
    workspaceId,
    role,
    clerkUserId,
    email: decoded.email,
    permissions: decoded.permissions || null,
  };
};

module.exports = {
  verifyUserToken,
};
