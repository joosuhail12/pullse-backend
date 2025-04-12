const BaseHandler = require('./BaseHandler');
const MentionService = require('../services/MentionService');

class MentionHandler extends BaseHandler {
    constructor() {
        super();
        this.mentionService = new MentionService();
    }

    async getUserMentions(req, reply) {
        const currentUserId = req.authUser.id;
        // If user_id is provided as a query parameter, use that, otherwise default to the current user
        const targetUserId = req.query.user_id || currentUserId;

        console.log(`Getting mentions for userId: ${targetUserId} (currentUser: ${currentUserId})`);

        const filters = {
            ticketId: req.query.ticket_id,
            userId: targetUserId,
            clientId: req.authUser.clientId,
            workspaceId: req.query.workspace_id,
            status: req.query.status,
            isRead: req.query.is_read === 'true',
            skip: parseInt(req.query.skip || 0),
            limit: parseInt(req.query.limit || 10)
        };

        return this.responder(req, reply, this.mentionService.getUserMentions(filters));
    }

    async markMentionAsRead(req, reply) {
        const mentionId = req.params.mention_id;
        const userId = req.authUser.id;

        return this.responder(req, reply, this.mentionService.markAsRead(mentionId, userId));
    }

    async createMention(req, reply) {
        const { ticketId, userId, content, mentionId, mentionedBy: requestMentionedBy } = req.body;
        // Use mentionedBy from request if provided, otherwise use the authenticated user ID
        const mentionedBy = requestMentionedBy || req.authUser.id;

        return this.responder(req, reply, this.mentionService.mentionUser(
            ticketId,
            userId,
            mentionedBy,
            content
        ));
    }

    /**
     * Update a mention
     * @param {*} req 
     * @param {*} reply 
     * @returns 
     */
    async updateMention(req, reply) {
        try {
            const mentionId = req.params.mention_id;
            const updateData = req.body;

            console.log(`Updating mention ${mentionId} with data:`, updateData);

            return this.responder(req, reply, this.mentionService.updateMention(mentionId, updateData));
        } catch (error) {
            console.error("Error updating mention:", error);
            return this.responder(req, reply, Promise.reject({
                success: false,
                message: error.message || "Failed to update mention"
            }));
        }
    }
}

module.exports = MentionHandler; 