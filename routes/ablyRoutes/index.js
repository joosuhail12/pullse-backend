const Handler = require("../../handlers/AblyHandler");
const authMiddlewares = require("../../middlewares/auth");

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
            headers: {
                type: "object",
                required: ["x-workspace-id"],
                properties: {
                    "x-workspace-id": { type: "string" },
                    "x-api-key": { type: "string" }
                }
            }
        },
        handler: async (req, reply) => {
            return handler.generateWidgetToken(req, reply);
        },
    });
}

module.exports = { activate }; 