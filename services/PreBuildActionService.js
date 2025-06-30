const errors = require("../errors");
const BaseService = require("./BaseService");
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class PreBuildActionService extends BaseService {
    constructor() {
        super();
        this.supabase = supabase;
        this.entityName = "pre_build_actions";
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

}

module.exports = PreBuildActionService;