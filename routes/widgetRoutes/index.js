const Handler = require("../../handlers/WidgetHandler");

const authMiddlewares = require("../../middlewares/auth");
const AuthType = require("../../constants/AuthType");

async function activate(app) {
    let handler = new Handler();

    let base_url = "/api/widgets";

    app.route({
        url: base_url,
        method: "GET",
        name: "GetWidget",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["Widgets"],
            summary: "Get Widgets",
            description: "API to get Widgets.",
            query: {
                workspace_id: {
                    type: "string",
                },
            },
        },
        handler:
            async (req, reply) => {
                return handler.getWidgets(req, reply);
            },
    });

    app.route({
        url: base_url,
        method: "POST",
        name: "CreateWidget",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["EmailChannels"],
            summary: "Create Email Channel",
            body: {
                type: "object",
                required: ["name", "themeName", "colors", "position", "labels", "persona", "isCompact"],
                properties: {
                    name: { type: "string", minLength: 1 },
                    themeName: { type: "string" },
                    colors: {
                        type: "object",
                        required: ["primary", "primaryForeground", "background", "foreground", "border", "userMessage", "userMessageText", "agentMessage", "agentMessageText", "inputBackground"],
                        properties: {
                            primary: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            primaryForeground: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            background: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            foreground: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            border: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            userMessage: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            userMessageText: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            agentMessage: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            agentMessageText: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            inputBackground: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" }
                        }
                    },
                    position: { type: "string" },
                    labels: {
                        type: "object",
                        required: ["welcomeTitle", "welcomeSubtitle"],
                        properties: {
                            welcomeTitle: { type: "string", minLength: 1 },
                            welcomeSubtitle: { type: "string", minLength: 1 }
                        }
                    },
                    persona: { type: "string" },
                    isCompact: { type: "boolean" },
                },
            },
        },
        handler:
            async (req, reply) => {
                return handler.createWidget(req, reply);
            },
    });

    app.route({
        url: base_url + "/:widget_id",
        method: "PATCH",
        name: "UpdateWidget",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["Widgets"],
            summary: "Update Widget",
            params: {
                type: "object",
                required: ["widget_id"],
                properties: {
                    widget_id: { type: "string" },
                },
            },
            body: {
                type: "object",
                minProperties: 1,
                additionalProperties: false,
                properties: {
                    name: { type: "string", minLength: 1 },
                    themeName: { type: "string" },
                    colors: {
                        type: "object",
                        properties: {
                            primary: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            primaryForeground: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            background: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            foreground: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            border: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            userMessage: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            userMessageText: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            agentMessage: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            agentMessageText: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
                            inputBackground: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" }
                        }
                    },
                    position: { type: "string" },
                    labels: {
                        type: "object",
                        properties: {
                            welcomeTitle: { type: "string", minLength: 1 },
                            welcomeSubtitle: { type: "string", minLength: 1 }
                        }
                    },
                    persona: { type: "string" },
                    isCompact: { type: "boolean" },
                    widgetThemeId: { type: "string" }
                },
            },
        },
        handler:
            async (req, reply) => {
                return handler.updateWidget(req, reply);
            },
    });

    app.route({
        url: base_url + "/:widget_id",
        method: "DELETE",
        name: "DeleteWidget",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["Widgets"],
            summary: "Delete Widget",
            params: {
                type: "object",
                required: ["widget_id"],
                properties: {
                    widget_id: { type: "string" },
                },
            },
        },
        handler:
            async (req, reply) => {
                return handler.deleteWidget(req, reply);
            },
    });

    app.route({
        url: base_url + "/:widget_id",
        method: "GET",
        name: "GetWidgetById",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["Widgets"],
            summary: "Get Widget By Id",
            params: {
                type: "object",
                required: ["widget_id"],
                properties: {
                    widget_id: { type: "string" },
                },
            },
        },
        handler:
            async (req, reply) => {
                return handler.getWidgetById(req, reply);
            },
    });

    // Get widget by api key
    app.route({
        url: base_url + "/getWidgetConfig/:api_key",
        method: "POST",
        name: "GetWidgetConfig",
        schema: {
            tags: ["Widgets"],
            summary: "Get Widget Config",
            params: {
                type: "object",
                required: ["api_key"],
                properties: {
                    api_key: { type: "string" },
                },
            },
            body: {
                type: "object",
                required: ["timezone"],
                properties: {
                    timezone: { type: "string" },
                },
            },
        },
        handler: async (req, reply) => {
            return handler.getWidgetConfig(req, reply);
        },
    });

    app.route({
        url: base_url + "/createContactDevice/:api_key",
        method: "POST",
        name: "CreateContactDevice",
        preHandler: authMiddlewares.verifyJWTToken(),
        schema: {
            tags: ["Widgets"],
            summary: "Create Contact Device",
            params: {
                type: "object",
                required: ["api_key"],
                properties: {
                    api_key: { type: "string" },
                },
            },
            body: {
                type: "object",
                properties: {
                    contact: {
                        type: "array",
                    },
                    company: {
                        type: "array",
                    },
                    customData: {
                        type: "array",
                    },
                },
            },
        },
        handler: async (req, reply) => {
            return handler.createContactDevice(req, reply);
        },
    });

    app.route({
        url: base_url + "/getContactDeviceTickets",
        method: "GET",
        name: "GetContactDeviceTickets",
        preHandler: authMiddlewares.verifyJWTToken(),
        schema: {
            tags: ["Widgets"],
            summary: "Get Contact Device Tickets",
        },
        handler: async (req, reply) => {
            return handler.getContactDeviceTickets(req, reply);
        },
    });

    app.route({
        url: base_url + "/getConversationWithTicketId/:ticket_id",
        method: "GET",
        name: "GetConversationWithTicketId",
        preHandler: authMiddlewares.verifyJWTToken(),
        schema: {
            tags: ["Widgets"],
            summary: "Get Conversation With Ticket Id",
            params: {
                type: "object",
                required: ["ticket_id"],
                properties: {
                    ticket_id: { type: "string" },
                },
            },
        },
        handler: async (req, reply) => {
            return handler.getConversationWithTicketId(req, reply);
        },
    });
}

module.exports = {
    activate,
};
