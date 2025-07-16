const { default: axios } = require("axios");
const errors = require("../errors");
const BaseService = require("./BaseService");
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class PreBuildActionService extends BaseService {
    constructor() {
        super();
        this.supabase = supabase;
        this.entityName = "pre_build_apps";
    }  

      async getPreBuildActionById(query) {
        try {
            const { data: preBuildAction, error: preBuildActionError } = await this.supabase
            .from(this.entityName)
            .select("*")
            .eq("id", query.id)
            .single();
            if (preBuildActionError) throw preBuildActionError;
            const responseData = {
                createdAt: preBuildAction.created_at,
                updatedAt: preBuildAction.updated_at,
                title: preBuildAction.title,
                id: preBuildAction.id,
                name: preBuildAction.name,
                description: preBuildAction.description,
                type: preBuildAction.type,
                parameters: preBuildAction.parameters,
                action: preBuildAction.action,
                action_id: preBuildAction.action_id,
                action_type: preBuildAction.action_type
            }
            return responseData;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getPreBuildActionByClientId(query) {
        const { data: preBuildActions, error: preBuildActionsError } = await this.supabase
            .from(this.entityName)
            .select("*")
            // .eq("client_id", query.clientId);
    
        if (preBuildActionsError) throw preBuildActionsError;
    
        // Map the data to match your mock data structure
        const mappedResponse = preBuildActions.map(action => ({
            id: action.id,
            name: action.name,
            description: "",
            icon: "",             
            category: "",     
            actionCount: 0,  
            color: "",           
            createdAt: action.created_at,
            updatedAt: action.created_at
        }));
    
        return mappedResponse;
    }

    async generatePrebuildAppConnections({clientId, workspaceId, userId, toolName}) {
        try {
            //send api request to get the prebuild app connections
            const { data: prebuildApp, error: prebuildAppError } = await this.supabase
                .from('pre_build_selected_apps')
                .select('id,pre_build_apps:pre_build_app_id(id, integration_id, name)')
                .eq('pre_build_apps.name', toolName)
                .eq('client_id', clientId)
                .eq('workspace_id', workspaceId)
            const preBuildSelectedApps = prebuildApp.find(app => app.pre_build_apps && app.pre_build_apps.name === toolName);
            console.log(preBuildSelectedApps, "preBuildSelectedApps---");
            if (prebuildAppError) throw prebuildAppError;
            const prebuildAppId = preBuildSelectedApps.id;
            const integrationId = preBuildSelectedApps.pre_build_apps.integration_id;
            const baseUrl = process.env.APP_ENVIRONMENT === 'development' ? 'http://localhost:8080' : 'https://dev-socket.pullseai.com';
            const pythonBaseUrl = process.env.APP_ENVIRONMENT === 'development' ? 'http://localhost:8000' : 'https://prodai.pullseai.com';
            console.log(integrationId, "integrationId---", userId, "userId---", baseUrl, "baseUrl---", pythonBaseUrl, "pythonBaseUrl---");
            const response = await axios.post(`${pythonBaseUrl}/connections/create-oauth-connection`, {
                "user_id":      userId,
                "integration_id": integrationId,
                "auth_scheme":  "OAUTH2",
                "redirect_url": `${baseUrl}/home/automation/ai/tools`,//if server is running on localhost, then use http://localhost:8080/home/automation/ai/tools, otherwise https://de
              });
            console.log(response, "response---");
            const prebuildAppConnections = response.data;
            console.log(prebuildAppConnections, "prebuildAppConnections---");
            // create a new prebuild app connection
            const { data: prebuildAppConnection, error: prebuildAppConnectionError } = await this.supabase
                .from('prebuild_app_connections')
                .insert({
                    user_id: userId,
                    pre_build_selected_apps_id: prebuildAppId,
                    integration_id: integrationId,
                    status: "active"
                });
            if (prebuildAppConnectionError) throw prebuildAppConnectionError;
            return {
                redirectUrl: prebuildAppConnections.redirect_url
            };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getPrebuildSelectedApps({clientId, workspaceId, userId}) {
        try  {
            const { data: prebuildSelectedApps, error: prebuildSelectedAppsError } = await this.supabase
            .from('pre_build_selected_apps')
            .select(`
                id,
                pre_build_apps:pre_build_app_id (
                id, name, description, category
                )
            `)
            .eq('client_id', 'ab0b23f8-bee9-4ccf-afd2-ecbb019d3f39');
            // const { data: prebuildSelectedApps, error: prebuildSelectedAppsError } = await this.supabase
            //     .from('pre_build_selected_apps')
            //     .select('pre_build_apps:pre_build_app_id(id, name, description, category),id')
            //     .eq('client_id', "ab0b23f8-bee9-4ccf-afd2-ecbb019d3f39")
            //     // .eq('workspace_id', workspaceId)
            if (prebuildSelectedAppsError) throw prebuildSelectedAppsError;
            console.log(prebuildSelectedApps, "prebuildSelectedApps---");
            const {data: prebuildAppConnections, error: prebuildAppConnectionsError} = await this.supabase
                .from('prebuild_app_connections')
                .select('*')
                .eq('user_id', userId)
                .in('pre_build_selected_apps_id', prebuildSelectedApps.map(app => app.id))
            if (prebuildAppConnectionsError) throw prebuildAppConnectionsError;
            console.log(prebuildAppConnections, "prebuildAppConnections---");
            const prebuildSelectedAppsData = prebuildSelectedApps.map(app => {
                return {
                    name: app.pre_build_apps.name,
                    description: app.pre_build_apps.description,
                    category: app.pre_build_apps.category,
                    connected: prebuildAppConnections.some(connection => connection.pre_build_selected_apps_id === app.id),
                    lastUsed: prebuildAppConnections.find(connection => connection.pre_build_selected_apps_id === app.id)?.created_at,
                    totalActions: 0,
                    activeActions: 0,
                }
            });
            console.log(prebuildSelectedAppsData, "prebuildSelectedAppsData---");
            return prebuildSelectedAppsData;
        } catch (err) {
            console.log(err, "err---");
            return this.handleError(err);
        }
    }
}

module.exports = PreBuildActionService;