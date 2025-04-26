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
        url: base_url,
        method: "PATCH",
        name: "UpdateWidget",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["Widgets"],
            summary: "Update Widget",
            query: {
                workspace_id: { type: "string" },
            },
            body: {
                type: "object",
                minProperties: 1,
                additionalProperties: false,
                properties: {
                    widgetTheme: {
                        type: "object",
                        minProperties: 1,
                        additionalProperties: false,
                        properties: {
                            name: {
                                type: "string",
                            },
                            colors: {
                                type: "object",
                                minProperties: 1,
                                additionalProperties: false,
                                properties: {
                                    textColor: { type: "string" },
                                    primaryColor: { type: "string" },
                                    backgroundColor: { type: "string" },
                                    userMessageBackgroundColor: { type: "string" },
                                    agentMessageBackgroundColor: { type: "string" },
                                },
                            },
                            labels: {
                                type: "object",
                                minProperties: 1,
                                additionalProperties: false,
                                properties: {
                                    welcomeTitle: { type: "string" },
                                    welcomeMessage: { type: "string" },
                                    welcomeSubtitle: { type: "string" },
                                },
                            },
                            layout: {
                                type: "object",
                                minProperties: 1,
                                additionalProperties: false,
                                properties: {
                                    offsetX: { type: "number" },
                                    offsetY: { type: "number" },
                                    isCompact: { type: "boolean" },
                                    placement: { type: "string" },
                                },
                            },
                            brandAssets: {
                                type: "object",
                                minProperties: 1,
                                additionalProperties: false,
                                properties: {
                                    headerLogo: { type: "string" },
                                    launcherIcon: { type: "string" },
                                },
                            },
                            widgetSettings: {
                                type: "object",
                                minProperties: 1,
                                additionalProperties: false,
                                properties: {
                                    allowedDomains: { type: "array", items: { type: "string" } },
                                },
                            },
                            interfaceSettings: {
                                type: "object",
                                minProperties: 1,
                                additionalProperties: false,
                                properties: {
                                    showBrandingBar: { type: "boolean" },
                                    showOfficeHours: { type: "boolean" },
                                    showAgentPresence: { type: "boolean" },
                                    showAgentChatStatus: { type: "boolean" },
                                    showTicketStatusBar: { type: "boolean" },
                                    enableMessageReaction: { type: "boolean" },
                                    allowVisitorsToEndChat: { type: "boolean" },
                                    enableConversationRating: { type: "boolean" },
                                },
                            },
                            widgetField: {
                                type: "array",
                            },
                        },
                    },
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
                required: ["contact", "company", "ticket", "customfield", "customobjectfield"],
                properties: {
                    contact: {
                        type: "array",
                    },
                    company: {
                        type: "array",
                    },
                    ticket: {
                        type: "array",
                    },
                    customfield: {
                        type: "array",
                    },
                    customobjectfield: {
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

    app.route({
        url: base_url + "/uploadWidgetAssets",
        method: "POST",
        name: "UploadWidgetAssets",
        preHandler: [
            authMiddlewares.checkToken(AuthType.user)
        ],
        schema: {
            tags: ["Widgets"],
            summary: "Upload Widget Assets",
            consumes: ['multipart/form-data'],
            query: {
                workspace_id: {
                    type: "string",
                    description: "Workspace ID"
                }
            }
        },
        handler: async (req, reply) => {
            if (!req.body.file) {
                return reply.status(400).send({
                    success: false,
                    message: "No file uploaded"
                });
            }

            const file = req.body.file;

            // Validate file type
            const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
            if (!allowedMimeTypes.includes(file.mimetype)) {
                return reply.status(400).send({
                    success: false,
                    message: "Invalid file type. Only images (JPEG, PNG, GIF, SVG) are allowed"
                });
            }

            // Validate file size (e.g., 5MB limit)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                return reply.status(400).send({
                    success: false,
                    message: "File too large. Maximum size is 5MB"
                });
            }

            return handler.uploadWidgetAsset(req, reply);
        }
    });

    app.route({
        url: base_url + "/getWidgetFieldOptions",
        method: "GET",
        name: "GetWidgetFieldOptions",
        preHandler: authMiddlewares.checkToken(AuthType.user),
        schema: {
            tags: ["Widgets"],
            summary: "Get Widget Field Options",
            query: {
                workspace_id: { type: "string" },
            },
        },
        handler: async (req, reply) => {
            return handler.getWidgetFieldOptions(req, reply);
        },
    });
}

module.exports = {
    activate,
};
