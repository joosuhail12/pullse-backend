const clerkClient = require('../config/clerkClient');
const BaseService = require('./BaseService');
const errors = require('../errors');

class ClerkAuthService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Validate the Clerk session token and return user claims.
   */
  async loginWithClerk(clerkSessionToken, _userAgent = null, _ip = null) {
    try {
      const payload = await clerkClient.verifyToken(clerkSessionToken);
      if (!payload || !payload.sub) {
        throw new errors.InvalidCredentials('Invalid Clerk session token');
      }

      const internalUserId = payload.internal_user_id || payload.internalUserId;
      const workspaceId = payload.workspace_id || payload.workspaceId;
      const role = payload.role;

      if (!internalUserId || !workspaceId || !role) {
        throw new errors.InvalidCredentials('Missing required claims in token');
      }

      return {
        id: internalUserId,
        clerkUserId: payload.sub,
        workspaceId,
        role,
        email: payload.email,
        permissions: payload.permissions || null,
        token: clerkSessionToken,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Fetch user details from Clerk.
   */
  async getCurrentClerkUser(clerkSessionToken) {
    try {
      const payload = await clerkClient.verifyToken(clerkSessionToken);
      if (!payload || !payload.sub) {
        throw new errors.InvalidCredentials('Invalid Clerk session token');
      }
      const user = await clerkClient.users.getUser(payload.sub);

      return {
        success: true,
        data: {
          clerkUser: user,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Since we do not store sessions, logout is a no-op.
   */
  async logoutClerkUser(_token) {
    return { message: 'Logged out successfully' };
  }

  /**
   * Validate a token and return the decoded claims.
   */
  async checkClerkToken(token) {
    try {
      const payload = await clerkClient.verifyToken(token);
      const internalUserId = payload.internal_user_id || payload.internalUserId;
      const workspaceId = payload.workspace_id || payload.workspaceId;
      const role = payload.role;

      if (!internalUserId || !workspaceId || !role) {
        throw new errors.Unauthorized();
      }

      return {
        id: internalUserId,
        workspaceId,
        role,
        clerkUserId: payload.sub,
        email: payload.email,
        permissions: payload.permissions || null,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

module.exports = ClerkAuthService;
