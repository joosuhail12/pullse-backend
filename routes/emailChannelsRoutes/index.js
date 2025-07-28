const Handler = require("../../handlers/EmailChannelsHandler");

const authMiddlewares = require("../../middlewares/auth");
const AuthType = require("../../constants/AuthType");

async function activate(app) {
    let handler = new Handler();

    let base_url = "/api/email-channels";

    app.route({
        url: base_url,
        method: "GET",
        name: "GetEmailChannels",
        preHandler: authMiddlewares.checkClerkToken(AuthType.user),
        schema: {
            tags: ["EmailChannels"],
            summary: "Get Email Channels",
            description: "API to get Email Channels.",
            query: {
                workspace_id: {
                    type: "string",
                },
            },
        },
        handler:
            async (req, reply) => {
                return handler.getEmailChannels(req, reply);
            },
    });

    app.route({
        url: base_url,
        method: "POST",
        name: "CreateEmailChannel",
        preHandler: authMiddlewares.checkClerkToken(AuthType.user),
        schema: {
            tags: ["EmailChannels"],
            summary: "Create Email Channel",
            body: {
                type: "object",
                required: ["name", "emoji", "teamId", "emailAddress", "autoBccMail", "noReplyMail"],
                properties: {
                    name: { type: "string", minLength: 1 },
                    emoji: { type: "string" },
                    teamId: { type: "string" },
                    emailAddress: { type: "string", minLength: 1 },
                    autoBccMail: { type: "string" },
                    noReplyMail: { type: "string" },
                },
            },
        },
        handler:
            async (req, reply) => {
                return handler.createEmailChannel(req, reply);
            },
    });

    app.route({
        url: base_url + "/:email_channel_id",
        method: "PATCH",
        name: "UpdateEmailChannel",
        preHandler: authMiddlewares.checkClerkToken(AuthType.user),
        schema: {
            tags: ["EmailChannels"],
            summary: "Update Email Channel",
            params: {
                type: "object",
                required: ["email_channel_id"],
                properties: {
                    email_channel_id: { type: "string" },
                },
            },
            body: {
                type: "object",
                minProperties: 1,
                additionalProperties: false,
                properties: {
                    name: { type: "string", minLength: 1 },
                    emoji: { type: "string" },
                    senderName: { type: "string", minLength: 1 },
                    teamId: { type: "string" }, emailAddress: { type: "string", minLength: 1 },
                    autoBccMail: { type: "string" },
                    noReplyMail: { type: "string" },
                    allowAgentOutbound: { type: "boolean" },
                    orignalSenderAsRequester: { type: "boolean" },
                    allowAgentName: { type: "boolean" },
                    isActive: { type: "boolean" },
                },
            },
        },
        handler:
            async (req, reply) => {
                return handler.updateEmailChannel(req, reply);
            },
    });

    app.route({
        url: base_url + "/:email_channel_id",
        method: "DELETE",
        name: "DeleteEmailChannel",
        preHandler: authMiddlewares.checkClerkToken(AuthType.user),
        schema: {
            tags: ["EmailChannels"],
            summary: "Delete Email Channel",
            params: {
                type: "object",
                required: ["email_channel_id"],
                properties: {
                    email_channel_id: { type: "string" },
                },
            },
        },
        handler:
            async (req, reply) => {
                return handler.deleteEmailChannel(req, reply);
            },
    });

    app.route({
        url: base_url + "/:email_channel_id",
        method: "GET",
        name: "GetEmailChannelDetails",
        preHandler: authMiddlewares.checkClerkToken(AuthType.user),
        schema: {
            tags: ["EmailChannels"],
            summary: "Get Email Channel Details",
            params: {
                type: "object",
                required: ["email_channel_id"],
                properties: {
                    email_channel_id: { type: "string" },
                },
            },
            query: {
                type: "object",
                properties: {
                    workspace_id: { type: "string" },
                },
            },
        },
        handler:
            async (req, reply) => {
                return handler.getEmailChannelDetails(req, reply);
            },
    });
}

module.exports = {
    activate,
};
