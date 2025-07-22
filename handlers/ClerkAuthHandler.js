const BaseHandler = require('./BaseHandler');
const ClerkAuthService = require('../services/ClerkAuthService');
const requestIp = require('request-ip');

class ClerkAuthHandler extends BaseHandler {
    constructor() {
        super();
        this.authService = new ClerkAuthService();
    }

    /**
     * Login using Clerk session token
     * Returns same format as original AuthHandler.checkCredentials
     */
    async loginWithClerk(req, reply) {
        try {
            const { clerkSessionToken } = req.body;
            const userAgent = req.headers['user-agent'] || 'Unknown';
            const ip = requestIp.getClientIp(req) || 'NA';

            const result = await this.authService.loginWithClerk(clerkSessionToken, userAgent, ip);

            return this.responder(req, reply, Promise.resolve(result));
        } catch (error) {
            return this.responder(req, reply, Promise.reject(error));
        }
    }

    /**
     * Get current Clerk user info
     */
    async getCurrentUser(req, reply) {
        try {
            const { clerkSessionToken } = req.body;
            const result = await this.authService.getCurrentClerkUser(clerkSessionToken);

            return this.responder(req, reply, Promise.resolve(result));
        } catch (error) {
            return this.responder(req, reply, Promise.reject(error));
        }
    }

    /**
     * Logout Clerk user
     */
    async logout(req, reply) {
        try {
            const { accessToken } = req.body;
            const result = await this.authService.logoutClerkUser(accessToken);

            return this.responder(req, reply, Promise.resolve(result));
        } catch (error) {
            return this.responder(req, reply, Promise.reject(error));
        }
    }

    /**
     * Check token validity (for middleware compatibility)
     */
    async checkToken(req, reply) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;
            const result = await this.authService.checkClerkToken(token);

            return this.responder(req, reply, Promise.resolve(result));
        } catch (error) {
            return this.responder(req, reply, Promise.reject(error));
        }
    }
}

module.exports = ClerkAuthHandler; 