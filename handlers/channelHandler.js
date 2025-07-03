const BaseHandler = require('./BaseHandler');
const ChannelService = require('../services/channelService');
class ChannelHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createChannel(req, reply) {
    let inst = new ChannelService();
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;
    return this.responder(req, reply, inst.createChannel(req.body));
  }

  async getAllChannels(req, reply) {
    let inst = new ChannelService();
    req.query.clientId = req.authUser.clientId;
    return this.responder(req, reply, inst.getChannels(req.query));
  }

  async addEmailToChannel(req, reply) {
    let channelId = req.params.channelId;
    let inst = new ChannelService();
    return this.responder(req, reply, inst.addEmailToChannel(channelId, req.body));
  }

  async assignChannelToTeam(req, reply) {
    let teamId = req.params.teamId;
    let channelId = req.params.channelId;
    let inst = new ChannelService();
    return this.responder(req, reply, inst.assignChannelToTeam(teamId, channelId));
  }

  async getTeamChannels(req, reply) {
    let teamId = req.params.teamId;
    let inst = new ChannelService();
    return this.responder(req, reply, inst.getTeamChannels(teamId));
  }

  async deleteChannel(req, reply) {
    let channelId = req.params.channelId;
    let inst = new ChannelService();
    return this.responder(req, reply, inst.deleteChannel(channelId));
  }

}

module.exports = ChannelHandler;
