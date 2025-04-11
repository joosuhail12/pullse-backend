const errors = require("../errors");
const BaseService = require("./BaseService");
const Ably = require("ably");

class AblyService extends BaseService {
    constructor() {
        super();
    }

    /**
     * Generate a temporary token for widget authentication
     * @param {Object} params - Parameters for widget token generation
     * @param {string} params.widgetId - The widget ID
     * @param {string} params.workspaceId - The workspace ID
     * @param {string} [params.visitorId] - Optional visitor/contact ID
     * @returns {Promise<Object>} Token details
     */
    async generateWidgetToken({ apiKey, workspaceId, session }) {
        try {
            if (!apiKey || !workspaceId) {
                throw new errors.BadRequest("API Key and Workspace ID are required");
            }

            const { widgetId, sessionId } = session;

            const widgetSession = await this.supabase.from("widgetsessions").select("*").eq("id", sessionId).eq("widgetId", widgetId).single();

            if (!widgetSession) {
                throw new errors.Unauthorized("Widget session not found");
            };

            // Create a fresh instance with the key that works
            const ably = new Ably.Rest({ key: "4_E1dA.cVZodg:Y-WcsfvXdmeJ-JXUrUJ6X6LIodTCGZ-T8C0dZey1hlQ" });

            // For widget clients, we want to limit capabilities
            const clientId = `widget_${widgetId}_widgetSessionId_${widgetSession.id}`;

            // Widgets should only have access to their specific channels
            const channelCapabilities = {};
            channelCapabilities[`${workspaceId}:widget:${apiKey}`] = ["subscribe", "publish", "presence"];

            // Create token params
            const tokenParams = {
                clientId: clientId,
                // capability: JSON.stringify(channelCapabilities),
                ttl: 3600 * 1000 // 1 hour in milliseconds
            };

            // Use the approach that works
            const tokenRequest = await ably.auth.createTokenRequest(tokenParams);

            return tokenRequest;
        } catch (error) {
            console.error("Widget Ably token generation error:", error);
            throw new errors.InternalServerError(error.message);
        }
    }
}

module.exports = AblyService; 