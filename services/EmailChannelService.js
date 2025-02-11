// services/EmailChannelService.js

const EmailChannelUtility = require('../db/utilities/EmailChannelUtility');
const BaseService = require('./BaseService');
const EmailDomainService = require('./EmailDomainService');
const TeamService = require('./TeamService');
const errors = require("../errors");

class EmailChannelService extends BaseService {
    constructor() {
        super();
        this.utilityInst = new EmailChannelUtility();
        this.domainService = new EmailDomainService();
        this.teamService = new TeamService();

        this.listingFields = [];
        this.updatableFields = [];
    }

    async createEmailChannel(emailChannelData) {
        try {
            const { clientId, workspaceId, domainId, teamId, channelName, senderName, senderEmailAddress, createdBy } = emailChannelData;

            const domain = await this.domainService.findOne({ id: domainId, clientId, workspaceId, isVerified: true });

            if (!domain) {
                return Promise.reject(new errors.NotFound(`Domain with id "${domainId}" not found.`));
            }

            let team = null;
            if (teamId !== undefined) {
                team = await this.teamService.findOne({ id: teamId, clientId, workspaceId });

                if (!team) {
                    return Promise.reject(new errors.NotFound(`Team with id "${teamId}" not found.`));
                }
            }

            const emailChannel = await this.utilityInst.insert({
                clientId,
                workspaceId,
                domainId,
                domainName: domain.domain,
                teamId: team?.id,
                teamName: team?.name,
                channelName,
                senderName,
                senderEmailAddress,
                createdBy,
            });
            return { id: emailChannel.id };
        } catch (e) {
            return this.handleError(e);
        }
    }

    async findEmailChannels(emailChannelData) {
        try {
            const { clientId, workspaceId } = emailChannelData;

            const emailChannels = await this.search({ clientId, workspaceId });

            console.log(emailChannels, "emailChannels");


            return emailChannels;
        } catch (e) {
            return this.handleError(e);
        }

    }

    async deleteEmailChannel(emailChannelData) {
        try {
            const { id } = emailChannelData;
            const emailChannel = await this.softDelete(id);

            return Promise.resolve();
        } catch (e) {
            return this.handleError(e);
        }
    }

    async getAllEmailChannel(emailChannelData) {
        try {
            const { clientId, workspaceId } = emailChannelData;

            const emailChannels = await this.search({ clientId, workspaceId });

            return emailChannels;
        } catch (e) {
            return this.handleError(e);
        }
    }

    async getEmailChannelById(emailChannelData) {
        try {
            const { id, clientId, workspaceId } = emailChannelData;

            const emailChannel = await this.findOne({ id, clientId, workspaceId });

            return emailChannel;
        } catch (e) {
            return this.handleError(e);
        }
    }

}

module.exports = EmailChannelService;