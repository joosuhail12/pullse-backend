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

    async createWorkflow(workflowData) {
        try {
            workflowData.id = uuid();
            const { data, error } = await this.supabase
                .from('workflows')
                .insert(workflowData)
                .select();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getWorkflowDetails(id) {
        try {
            const { data, error } = await this.supabase
                .from('workflows')
                .select()
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateWorkflow(id, updateValues) {
        try {
            const { error } = await this.supabase
                .from('workflows')
                .update(updateValues)
                .eq('id', id);
            if (error) throw error;
            return { message: "Updated successfully" };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteWorkflow(id) {
        try {
            const { error } = await this.supabase
                .from('workflows')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { message: "Deleted successfully" };
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = WorkflowService;
