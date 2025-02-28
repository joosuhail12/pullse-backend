const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const { v4: uuid } = require("uuid");

class WorkflowActionService extends BaseService {
    constructor(fields = null, dependencies = {}) {
        super();
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.TicketService = dependencies.TicketService || null;
        this.EmailService = dependencies.EmailService || null;
        this.entityName = 'WorkflowAction';
        this.listingFields = ["id", "name"];
        this.updatableFields = ["name", "description", "summary", "position", "type", "attributes", "customAttributes", "fieldName", "fieldValue", "additionalData"];
    }

    async createWorkflowAction(actionData) {
        try {
            const { data, error } = await this.supabase
                .from('workflow_actions')
                .insert(actionData)
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
                .from('workflow_actions')
                .select()
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateWorkflowAction(id, updateValues) {
        try {
            const { error } = await this.supabase
                .from('workflow_actions')
                .update(updateValues)
                .eq('id', id);
            if (error) throw error;
            return { message: "Updated successfully" };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteWorkflowAction(id) {
        try {
            const { error } = await this.supabase
                .from('workflow_actions')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { message: "Deleted successfully" };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async sendEmailAction({ id }, { to, subject, body }) {
        try {
            let inst = new this.EmailService();
            return await inst.sendEmail({ to, subject, html: body });
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = WorkflowActionService;
