const Promise = require("bluebird");
const errors = require("../errors");
const TeamUtility = require('../db/utilities/TeamUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");

class TeamService extends BaseService {

    constructor(fields=null, dependencies=null) {
        super();
        this.utilityInst = new TeamUtility();
        this.entityName = 'Team';
        this.listingFields = ["-_id"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = [ "name", "description", ];
    }

    async createTeam(data) {
        try {
            return this.create(data);
        } catch(err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let team = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(team)) {
                return Promise.reject(new errors.AlreadyExist(this.entityName + " not exist."));
            }
            return team;
        }  catch(err) {
            return this.handleError(err);
        }
    }

    async updateTeam({ id, workspaceId, clientId }, updateValues) {
        try {
            let team = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: team.id}, updateValues);
            return Promise.resolve();
        } catch(e) {
            return Promise.reject(e);
        }
    }

    async deleteTeam({ id, workspaceId, clientId }) {
        try {
            let team = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(team.id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, workspaceId, clientId }) {
        let filters = {};
        filters.clientId = clientId;
        filters.workspaceId = workspaceId;

        if (name) {
            filters.name = { $regex : `^${name}`, $options: "i" };
        }

        if (createdFrom) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$gte'] = createdFrom;
        }
        if (createdTo) {
            if (!filters.createdAt) {
                filters.createdAt = {}
            }
            filters.createdAt['$lt'] = createdTo;
        }

        return filters;
    }
}

module.exports = TeamService;
