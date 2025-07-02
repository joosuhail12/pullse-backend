const Promise = require("bluebird");
const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");

class ChannelService extends BaseService {
    constructor(fields = null, dependencies = null) {
        super();
        this.entityName = "channels";
        this.listingFields = [
            "id",
            "clientid",
            "workspaceid",
            "name",
            "type",
            "config",
            "isactive",
            "createdat",
            "updatedat"
        ];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = ["name", "type", "config", "isActive"];
    }

    async createChannel(data) {
        try {
            await this.create(data);
            return this.getChannels({ clientId: data.clientId });
        } catch (err) {
            return this.handleError(err);
        }
    }

    async deleteChannel(id) {
        try {
            let res = await this.softDelete(id, 'archivedAt');
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getChannels(filters = {}) {
        try {
            const query = this.supabase
                .from(this.entityName)
                .select(this.listingFields.join(","))
                .eq('clientid', filters.clientId || null)
                .order('createdat', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async addEmailToChannel(channelId, emailData) {
        try {
            const { data, error } = await this.supabase
                .from('channelEmails')
                .insert([{
                    channelId: channelId,
                    emailAddress: emailData.emailAddress,
                    domain: emailData.domain,
                    protocolConfig: emailData.protocolConfig
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async assignChannelToTeam(teamId, channelId) {
        try {
            const { data, error } = await this.supabase
                .from('teamChannels')
                .insert([{
                    teamId: teamId,
                    channelId: channelId
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getTeamChannels(teamId) {
        try {
            const { data, error } = await this.supabase
                .from('teamChannels')
                .select(`
                    channelId,
                    channels (
                        id, name, type, config, isActive
                    )
                `)
                .eq('teamId', teamId);
            if (error) throw error;
            return data;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, type, clientId, isActive, createdFrom, createdTo }) {
        let filters = {};
        filters.clientId = clientId;

        if (name) {
            filters.name = { $ilike: `%${name}%` };
        }

        if (type) {
            filters.type = type;
        }

        if (typeof isActive === 'boolean') {
            filters.isActive = isActive;
        }

        if (createdFrom) {
            filters.createdAt = { $gte: createdFrom };
        }

        if (createdTo) {
            filters.createdAt = { ...filters.createdAt, $lte: createdTo };
        }

        return filters;
    }
}

module.exports = ChannelService;
