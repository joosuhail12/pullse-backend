const Promise = require("bluebird");
const errors = require("../errors");
const ClientUtility = require('../db/utilities/ClientUtility');
const BaseService = require("./BaseService");
const AuthService = require("./AuthService");
const _ = require("lodash");
const ClientConstants = require('../constants/ClientConstants');
const WorkspaceService = require("./WorkspaceService");


class ClientService extends BaseService {

    constructor(fields=null, dependencies={}) {
        super();
        this.utilityInst = new ClientUtility();
        this.WorkspaceService = WorkspaceService; // dependencies.WorkspaceService
        this.AuthService = AuthService; // dependencies.AuthService
        this.entityName = 'Client';
        this.listingFields = ['id', 'name', 'status', "-_id"];
        this.updatableFields = ['name', 'status', 'ownerId'];
    }

    async createClient({ name, status, owner, createdBy }) {
        try {
            let client = await this.findOne({ name: { $regex : `^${name}$`, $options: "i" } });
            // can convert case to lower and then md5 for it to check if name already exist
            if (client) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${name}" already exists.`));
            }
            const userInst = new this.AuthService();
            const workspaceServiceInst = new this.WorkspaceService(null, { AuthService: this.AuthService});
            let user = await userInst.findOne({ email: owner.email });
            if (user) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} owner with email "${owner.email}" already exists.`));
            }

            client = await this.create({ name, status, createdBy });
            owner.clientId = client.id;
            owner.createdBy = createdBy;
            owner.roleIds = 'AGENT_ADMIN';
            let workspaceData = { name: `${name}-workspace`, clientId: client.id, createdBy};
            user = await userInst.createUser(owner);
            let workspace = await workspaceServiceInst.createWorkspace(workspaceData);

            await this.updateClient(client.id, { ownerId: user.id });
            return {
                client,
                user,
                workspace
            };
        } catch(err) {
            return this.handleError(err);
        }
    }

    async updateClient(client_id, updateValues) {
        try {
            await this.update({ id: client_id }, updateValues);
            // can convert case to lower and then md5 for it to check if name already exist

            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }

    async deleteClient(id) {
        try {
            let res = await this.softDelete(id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

}

module.exports = ClientService;
