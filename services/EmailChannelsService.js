const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");

class EmailChannelsService extends BaseService {
    constructor() {
        super();
        this.entityName = "emailchannels";
    }

    async getEmailChannels({ workspaceId, clientId }) {
        try {
            const { data, error } = await this.supabase.from(this.entityName).select("*").eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null);

            const { data: domainData, error: domainError } = await this.supabase.from("emaildomains").select("id").eq("workspaceId", workspaceId).eq("clientId", clientId).is("archiveAt", null).eq("isVerified", true);

            if (error || domainError) {
                throw new errors.InternalServerError(error.message);
            }
            return {
                emailChannels: data,
                doesUserHaveVerifiedDomain: domainData.length > 0
            };
        } catch (error) {
            throw new errors.InternalServerError(error.message);
        }
    }

    async createEmailChannel(data) {
        try {
            let { name, emoji, teamId, emailAddress, autoBccMail, noReplyMail, workspaceId, clientId, createdBy, senderName } = data;
            let { data: createdData, error } = await this.supabase.from(this.entityName).insert({ name, emoji, teamId: teamId ? teamId : null, emailAddress, autoBccMail, noReplyMail, workspaceId, clientId, createdBy, senderName }).select();
            if (error) {
                throw new errors.InternalServerError(error.message);
            }
            return createdData;
        } catch (error) {
            throw new errors.InternalServerError(error.message);
        }
    }

    async updateEmailChannel(data) {
        try {
            let { name, emoji, teamId, emailAddress, autoBccMail, noReplyMail, workspaceId, clientId, createdBy, senderName, emailChannelId, isActive } = data;
            let { data: updatedData, error } = await this.supabase.from(this.entityName).update({ name, emoji, teamId: teamId ? teamId : null, emailAddress, autoBccMail, noReplyMail, workspaceId, clientId, createdBy, senderName, isActive, updatedAt: `now()` }).eq("id", emailChannelId).select();
            if (error) {
                throw new errors.InternalServerError(error.message);
            }
            return updatedData;
        } catch (error) {
            throw new errors.InternalServerError(error.message);
        }
    }

    async deleteEmailChannel(data) {
        try {
            let { emailChannelId, workspaceId, clientId, createdBy } = data;
            let { data: deletedData, error } = await this.supabase.from(this.entityName).update({ deletedAt: `now()` }).eq("id", emailChannelId).select();
            if (error) {
                throw new errors.InternalServerError(error.message);
            }
            return deletedData;
        } catch (error) {
            throw new errors.InternalServerError(error.message);
        }
    }

    async getEmailChannelByEmailAddress({ emailAddress }) {
        try {
            const { data, error } = await this.supabase.from(this.entityName).select("*").eq("emailAddress", emailAddress).eq("isActive", true).is("deletedAt", null).single();
            if (error) {
                throw new errors.Internal(error.message);
            }
            return data;
        } catch (error) {
            throw new errors.Internal(error.message);
        }
    }
}

module.exports = EmailChannelsService;