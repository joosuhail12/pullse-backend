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
            const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY });

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

    /**
     * Generate a temporary token for agent dashboard authentication
     * @param {Object} params - Parameters for agent token generation
     * @param {string} params.workspaceId - The workspace ID
     * @param {Object} params.user - The authenticated user object
     * @returns {Promise<Object>} Token details
     */
    async generateAgentToken({ workspaceId, user }) {
        try {
            if (!workspaceId || !user) {
                throw new errors.BadRequest("Workspace ID and user are required");
            }

            // Verify user has access to the workspace
            const { data: userPermission, error: permissionError } = await this.supabase
                .from("workspacePermissions")
                .select("*")
                .eq("userId", user.id)
                .eq("workspaceId", workspaceId)
                .single();

            if (permissionError || !userPermission) {
                throw new errors.Unauthorized("User does not have access to this workspace");
            }

            // Create a fresh instance with the Ably key
            const ably = new Ably.Rest({ key: "4_E1dA.cVZodg:Y-WcsfvXdmeJ-JXUrUJ6X6LIodTCGZ-T8C0dZey1hlQ" });

            // For agent clients, create a specific client ID
            const clientId = `agent_${user.id}_workspace_${workspaceId}`;

            // Agents should have access to workspace-specific channels
            const channelCapabilities = {};
            channelCapabilities[`${workspaceId}:agent:*`] = ["subscribe", "publish", "presence"];
            channelCapabilities[`${workspaceId}:ticket:*`] = ["subscribe", "publish"];
            channelCapabilities[`agent-conversation:*`] = ["subscribe", "publish"];
            channelCapabilities[`ticket:*`] = ["subscribe", "publish"];

            // Create token params
            const tokenParams = {
                clientId: clientId,
                // capability: JSON.stringify(channelCapabilities),
                ttl: 4 * 3600 * 1000 // 4 hours in milliseconds
            };

            // Generate the token request
            const tokenRequest = await ably.auth.createTokenRequest(tokenParams);

            return tokenRequest;
        } catch (error) {
            console.error("Agent Ably token generation error:", error);
            throw new errors.InternalServerError(error.message);
        }
    }
}

module.exports = AblyService; 