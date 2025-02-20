
const BaseFileSystem = require('../FileManagement/BaseFileSystem');
const BaseHandler = require('./BaseHandler');
const AuthService = require('../services/AuthService');
const WorkspaceService = require('../services/WorkspaceService');
const ConversationService = require('../services/ConversationService');
const CustomerService = require('../services/CustomerService');
const TagService = require('../services/TagService');
const path = require("path");
const AuthType = require('../constants/AuthType');
const TicketChannel = require('../constants/TicketChannel');

class WebhookHandler extends BaseHandler {

  constructor() {
    super();
    this.workspaceServiceInst = new WorkspaceService(null, {AuthService});
    this.conversationServiceInst = new ConversationService();
    this.customerServiceInst = new CustomerService(null, { TagService });
  }

  async processEmail(req, reply, source) {
    let inst = new BaseFileSystem();
    let data = {};
    data.body = req.body;
    data.headers = req.headers;
    data.params = req.params;
    let fileSrc = path.join(__dirname, "../", "tmp", (Date.now()) +".json");
    try {
      await inst.writeFile(fileSrc, JSON.stringify(data));
      let internalEmail = req.body.envelope.to;
      let workspaceId = internalEmail.split('@');
      let workspace = this.workspaceServiceInst.findOrFail(workspaceId);
      let clientId = workspace.clientId;
      let customer = await this.customerServiceInst.findOrCreateCustomer({ email: req.body.from, workspaceId, clientId});

      let createdBy = customer.id;
      let userType = AuthType.customer;

      let messageData = {
        clientId,
        createdBy,
        workspaceId,
        message: req.body.text || req.body.html,
        type: req.body.message_type,
        userType,
      };
      let ticketData = {
        title: req.body.subject,
        description: req.body.subject,
        ticketCreatedBy: userType,
        customerId: req.authUser.id,
        channel: TicketChannel.email
        // don't create new ticket if a conversation exist with Message-ID
      };
      await this.conversationServiceInst.addMessage(messageData, ticketData);
    } catch (error) {
      console.error(error);
    }
    return this.responder(req, reply, Promise.resolve());
  }
}

module.exports = WebhookHandler;
