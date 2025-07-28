const Handler = require("../../handlers/AblyHandler");
const authMiddlewares = require("../../middlewares/auth");
const AuthType = require("../../constants/AuthType");

async function activate(app) {
    let handler = new Handler();
    let base_url = "/api/ably";

    app.route({
        url: base_url + "/widgetToken",
        method: "GET",
        name: "GenerateWidgetAblyToken",
        preHandler: authMiddlewares.verifyJWTToken(),
        consumes: ["application/json", "application/x-www-form-urlencoded"],
        schema: {
            tags: ["Ably"],
            summary: "Generate Widget Ably Token",
            description: "API to generate a temporary Ably token for widget clients.",
        },
        handler: async (req, reply) => {
            return handler.generateWidgetToken(req, reply);
        },
    });

    app.route({
        url: base_url + "/agentToken",
        method: "GET",
        name: "GenerateAgentAblyToken",
        preHandler: authMiddlewares.checkClerkToken(AuthType.user),
        consumes: ["application/json", "application/x-www-form-urlencoded"],
        schema: {
            tags: ["Ably"],
            summary: "Generate Agent Dashboard Ably Token",
            description: "API to generate a temporary Ably token for agent dashboard clients.",
            headers: {
                type: "object",
                properties: {
                    "x-workspace-id": {
                        type: "string",
                        description: "Workspace ID (optional, defaults to user's default workspace)"
                    }
                }
            }
        },
        handler: async (req, reply) => {
            return handler.generateAgentToken(req, reply);
        },
    });
}

module.exports = { activate }; 