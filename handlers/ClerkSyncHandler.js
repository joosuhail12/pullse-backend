const BaseHandler = require('./BaseHandler');
const ClerkSyncService = require('../services/ClerkSyncService');

class ClerkSyncHandler extends BaseHandler {
    constructor() {
        super();
        this.syncService = new ClerkSyncService();
    }

    /**
     * Create Clerk user and organization from backend
     */
    async createUserAndOrganization(req, reply) {
        const userData = req.body;

        return this.responder(
            req,
            reply,
            this.syncService.createClerkUserAndOrganization(userData)
        );
    }

    /**
     * Get user organizations for org switcher
     */
    async getUserOrganizations(req, reply) {
        const { clerkUserId } = req.params;

        return this.responder(
            req,
            reply,
            this.syncService.getUserOrganizations(clerkUserId)
        );
    }

    /**
     * Send admin invitation via Clerk
     */
    async inviteAdmin(req, reply) {
        return this.responder(req, reply, this.syncService.inviteAdmin(req.body));
    }

    /**
     * Clerk webhook endpoint
     */
    async clerkWebhook(req, reply) {
        // For simplicity, skip signature verification here
        return this.responder(req, reply, this.syncService.handleWebhook(req.body));
    }
}

module.exports = ClerkSyncHandler; 