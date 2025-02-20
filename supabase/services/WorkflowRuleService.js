const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const { v4: uuid } = require("uuid");

class WorkflowRuleService extends BaseService {
    constructor() {
        super();
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.entityName = 'WorkflowRule';
        this.listingFields = ["id", "name"];
        this.updatableFields = ["name", "description", "summary", "matchType", "properties", "position", "status"];
    }

    async createWorkflowRule(ruleData) {
        try {
            const { data, error } = await this.supabase
                .from('workflow_rules')
                .insert(ruleData)
                .select();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id) {
        try {
            const { data, error } = await this.supabase
                .from('workflow_rules')
                .select()
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateWorkflowRule(id, updateValues) {
        try {
            const { error } = await this.supabase
                .from('workflow_rules')
                .update(updateValues)
                .eq('id', id);
            if (error) throw error;
            return { message: "Updated successfully" };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteWorkflowRule(id) {
        try {
            const { error } = await this.supabase
                .from('workflow_rules')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { message: "Deleted successfully" };
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = WorkflowRuleService;
