const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const { v4: uuid } = require("uuid");

class WorkflowService extends BaseService {
    constructor() {
        super();
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.entityName = 'Workflow';
        this.listingFields = ["id", "name", "description", "status", "affectedTicketsCount"];
        this.updatableFields = ["name", "summary", "description", "status", "ruleIds", "actionIds", "lastUpdatedBy"];
    }

    async createWorkflowFolder(data) {
        try {
            const { name, workspaceId, clientId, createdBy } = data;

            // Check if the folder name already exists
            const { data: existingFolder, error: existingFolderError } = await this.supabase
                .from('workflowFolder')
                .select('*')
                .eq('name', name)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null)
                .single();

            if (existingFolderError) {
                console.log("Error in createWorkflowFolder()", existingFolderError);
                throw new errors.BadRequestError(existingFolderError.message);
            }

            if (existingFolder) {
                throw new errors.BadRequestError("Folder name already exists");
            }


            const { data: newFolder, error } = await this.supabase
                .from('workflowFolder')
                .insert({ name, workspaceId, clientId, createdBy })
                .select()

            if (error) {
                console.log("Error in createWorkflowFolder()", error);
                throw new errors.BadRequestError(error.message);
            }

            return newFolder;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async getWorkflowFolders(data) {
        try {
            const { workspaceId, clientId } = data;
            const { data: folders, error } = await this.supabase
                .from('workflowFolder')
                .select('*')
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null)
                .order('createdAt', { ascending: false });

            if (error) {
                console.log("Error in getWorkflowFolders()", error);
                throw new errors.InternalServerError(error.message);
            }

            return folders;
        } catch (error) {
            return this.handleError(error);
        }
    }

    async deleteWorkflowFolder(id) {
        try {
            const { data: deletedFolder, error } = await this.supabase
                .from('workflowFolder')
                .update({ deletedAt: new Date() })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.log("Error in deleteWorkflowFolder()", error);
                throw new errors.InternalServerError(error.message);
            }

            return deletedFolder;
        } catch (error) {
            console.log("Error in deleteWorkflowFolder()", error);
            return this.handleError(error);
        }
    }
}

module.exports = WorkflowService;
