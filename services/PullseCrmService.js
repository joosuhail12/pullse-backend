const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const { v4: uuid } = require("uuid");

class PullseCrmService extends BaseService {
    constructor() {
        super();
    }


    async createNewUser(userData) {
        try {
            const { name, email, company_name } = userData;
            /* 1. Create new client 
               2. Create new workspace
               3. Create new user
               4. Create new workspacePermission
               5. Create new widget
               6. Create new widgetTheme
               7. Create new widgetfield
               8. Create new widgetApiKey
               9. Create new default email channel
            */

            const { data: client, error: clientError } = await this.supabase.from('clients').insert({
                name: company_name,
                status: 'ACTIVE',
                createdBy: 'API',
            }).select().single();

            if (clientError) {
                console.log(clientError);
                throw new clientError;
            }

            const { data: workspace, error: workspaceError } = await this.supabase.from('workspace').insert({
                name: company_name,
                clientId: client.id,
                status: true,
            }).select().single();

            if (workspaceError) {
                console.log(workspaceError);
                throw new workspaceError;
            }

            const { data: user, error: userError } = await this.supabase.from('users').insert({
                name: name,
                fName: name.split(" ")[0],
                lName: name.split(" ")[1],
                email: email,
                clientId: client.id,
                password: "$2b$12$ffTYP0KBSsoAnsaqmmAB4.Uz9dQ9M/TjZ33BijBKauTNplRKgiXwK",
                defaultWorkspaceId: workspace.id,
                status: 'active',
                createdBy: 'API',
            }).select().single();

            if (userError) {
                console.log(userError);
                throw new userError;
            }

            const { data: workspacePermission, error: workspacePermissionError } = await this.supabase.from('workspacePermissions').insert({
                workspaceId: workspace.id,
                clientId: client.id,
                userId: user.id,
                role: 'ORGANIZATION_ADMIN',
                access: true,
                createdBy: 'API',

            }).select().single();

            if (workspacePermissionError) {
                console.log(workspacePermissionError);
                throw new workspacePermissionError;
            }

            const { data: widget, error: widgetError } = await this.supabase.from('widget').insert({
                name: 'Chat Widget',
                clientId: client.id,
                workspaceId: workspace.id,
            }).select().single();

            if (widgetError) {
                console.log(widgetError);
                throw new widgetError;
            }

            const { data: widgetTheme, error: widgetThemeError } = await this.supabase.from('widgettheme').insert({
                name: 'Chat Widget Theme',
                widgetId: widget.id,
                colors: {
                    "border": "#E1E1E1",
                    "primary": "#9b87f5",
                    "background": "#FFFFFF",
                    "foreground": "#1A1F2C",
                    "userMessage": "#9b87f5",
                    "agentMessage": "#F1F1F1",
                    "inputBackground": "#F9F9F9",
                    "userMessageText": "#FFFFFF",
                    "agentMessageText": "#1A1F2C",
                    "primaryForeground": "#FFFFFF"
                },
                labels: {
                    "welcomeTitle": "hello",
                    "welcomeSubtitle": "welcomeSubtitle"
                },
                layout: {
                    "offsetX": 4,
                    "offsetY": 56,
                    "isCompact": false,
                    "placement": "right"
                },
                brandAssets: {
                    "headerLogo": "https://pub-1db3dea75deb4e36a362d30e3f67bb76.r2.dev/pullse/widgets-6c22b22f-7bdf-43db-b7c1-9c5884125c63-1746498482576",
                    "launcherIcon": "https://framerusercontent.com/images/9N8Z1vTRbJsHlrIuTjm6Ajga4dI.png"
                },
                widgetSettings: {
                    "allowedDomains": []
                },
                interfaceSettings: {
                    "showBrandingBar": true,
                    "showOfficeHours": false,
                    "showAgentPresence": false,
                    "showAgentChatStatus": false,
                    "showTicketStatusBar": false,
                    "showTeamAvailability": true,
                    "enableMessageReaction": false,
                    "allowVisitorsToEndChat": false,
                    "enableConversationRating": true,
                    "enableDeliveryReadReceipts": false
                }
            }).select().single();

            if (widgetThemeError) {
                console.log(widgetThemeError);
                throw new widgetThemeError;
            }

            const { data: widgetField, error: widgetFieldError } = await this.supabase.from('widgetfield').insert({
                clientId: client.id,
                workspaceId: workspace.id,
                widgetId: widget.id,
                fieldSourceType: "contact",
                standardFieldName: "email",
                label: "Email",
                placeholder: "Enter email",
                isRequired: true,
                type: "text",
            }).select().single();

            if (widgetFieldError) {
                console.log(widgetFieldError);
                throw new widgetFieldError;
            }

            const { data: widgetApiKey, error: widgetApiKeyError } = await this.supabase.from('widgetapikeyrelation').insert({
                widgetId: widget.id,
            }).select().single();

            if (widgetApiKeyError) {
                console.log(widgetApiKeyError);
                throw new widgetApiKeyError;
            }

            // Generate a random email address using company_name and a 4 digit random number
            const randomNumber = Math.floor(1000 + Math.random() * 9000);
            const emailAddress = `${company_name.toLowerCase()}${randomNumber}@mail.pullseai.com`;

            const { data: defaultEmailChannel, error: defaultEmailChannelError } = await this.supabase.from('emailchannels').insert({
                name: 'Default Email Channel',
                clientId: client.id,
                workspaceId: workspace.id,
                senderName: name,
                isActive: true,
                isDefault: true,
                emailAddress: emailAddress
            }).select().single();

            if (defaultEmailChannelError) {
                console.log(defaultEmailChannelError);
                throw new defaultEmailChannelError;
            }

            return {
                emailAddress: emailAddress,
            }
        } catch (err) {
            return this.handleError({
                error: true,
                message: "Failed to create new user",
                data: err,
                httpCode: 400,
                code: "CREATE_NEW_USER_ERROR"
            });
        }
    }
}

module.exports = PullseCrmService;