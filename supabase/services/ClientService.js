const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const WorkspaceService = require("./WorkspaceService");
const WorkspacePermissionService = require("./WorkspacePermissionService");
const UserService = require("./UserService");
const config = require("../config");

class ClientService extends BaseService {
    constructor() {
        super();
        this.entityName = 'Client';
        this.listingFields = ['id', 'name', 'status'];
        this.updatableFields = ['name', 'status', 'owner_id'];
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }

    async createClient({ name, status, owner, createdBy }) {
        try {
            const { data: existingClient, error: clientError } = await this.supabase
                .from('clients')
                .select('id')
                .ilike('name', name)
                .single();

            if (existingClient) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${name}" already exists.`));
            }

            const workspaceService = new WorkspaceService();
            const userService = new UserService();

            let { data: user, error: userError } = await this.supabase
                .from('users')
                .select('id')
                .eq('email', owner.email)
                .single();

            if (user) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} owner with email "${owner.email}" already exists.`));
            }

            const { data: client, error: createClientError } = await this.supabase
                .from('clients')
                .insert([{ name, status, created_by: createdBy }])
                .select()
                .single();

            if (createClientError) throw createClientError;

            owner.client_id = client.id;
            owner.created_by = createdBy;

            user = await userService.createUser(owner);

            await this.supabase
                .from('clients')
                .update({ owner_id: user.id })
                .eq('id', client.id);

            let workspaceData = { name: `${name}-workspace`, client_id: client.id, created_by: createdBy };
            let workspace = await workspaceService.createWorkspace(workspaceData);

            await this.supabase
                .from('clients')
                .update({ default_workspace_id: workspace.id })
                .eq('id', client.id);

            return { client, user, workspace };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async findClientById(id) {
        try {
            const { data, error } = await this.supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateClient(clientId, updateValues) {
        try {
            const { error } = await this.supabase
                .from('clients')
                .update(updateValues)
                .eq('id', clientId);
            if (error) throw error;
            return Promise.resolve();
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteClient(id) {
        try {
            const { error } = await this.supabase
                .from('clients')
                .update({ deleted_at: new Date() })
                .eq('id', id);
            if (error) throw error;
            return Promise.resolve();
        } catch (err) {
            return this.handleError(err);
        }
    }
}

module.exports = ClientService;
