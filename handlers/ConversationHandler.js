const BaseHandler = require('./BaseHandler');
const ConversationService = require('../services/ConversationService');
const CustomerService = require('../services/CustomerService');
const TagService = require('../services/TagService');

const EventConstants = require("../Socket/EventConstants");
const TicketChannel = require('../constants/TicketChannel');
const { UserType } = require('../constants/ClientConstants');
const errors = require('../errors');
const { v4: uuid } = require('uuid');
const UAParser = require('ua-parser-js')
const requestIp = require('request-ip');


class ConversationHandler extends BaseHandler {

  constructor() {
    super();
    this.customerServiceInst = new CustomerService(null, { TagService });
  }

  async createCustomerTicket(req, reply) {
    let clientId = req.authUser.clientId;
    let workspaceId = req.authUser.workspaceId;
    let userType = UserType.customer;
    const userAgent = req.headers['user-agent'];
    const clientIp = requestIp.getClientIp(req);
    let ua = new UAParser(userAgent);
    let os = ua.getOS();
    let device = 'web';
    let osName =  os?.name ? os.name.toLocaleLowerCase() : null;
    if (['ios', 'android'].includes(osName)) {
      device = osName;
    }

    let session;
    if (!req.authUser?.email) {
      if (req.body.customer?.email) {
        let inst = this.customerServiceInst;
        let customer = await inst.findOrCreateCustomer({
          email: req.body.customer.email, workspaceId, clientId,
          name: req.body.customer.firstname ? req.body.customer.firstname : req.body.customer.email,
          type: "customer",
          createdBy: "chat-widget"
        });
        req.authUser = customer;
        session = {
          id: uuid(),
          issuedAt: new Date(),
          expiry: (Date.now() + (12 * 60 * 60 * 1000)), // 12 hour from now
          userAgent: userAgent,
          ip: clientIp
        };
        await inst.updateOne({ id: customer.id }, {$push: {sessions: session}, lastActiveAt: new Date()});
        // reply.setCookie('sessionid', session.id, {
        //   maxAge: session.expiry,
        //   expires: session.expiry,
        //   path: '/',
        //   // signed: true
        // });
      } else {
        return this.responder(req, reply, Promise.reject(new errors.Unauthorized()));
      }
    } else if (!req.headers['session-id']) {
      return this.responder(req, reply, Promise.reject(new errors.Unauthorized()));
    }
    let inst = new ConversationService();
    let createdBy = req.authUser.id;
    let messageData = {
      clientId,
      createdBy,
      workspaceId,
      message: req.body.message,
      type: req.body.message_type,
      userType,
    };
    let ticketData = {
      title: `New Conversation`,
      description: req.body.message,
      ticketCreatedBy: userType,
      customerId: req.authUser.id,
      channel: TicketChannel.messenger,
      device,
      // sessionId: req.cookies.sessionid ? req.cookies.sessionid: session?.id,
      sessionId: req.headers['session-id'] ? req.headers['session-id']: session?.id,
    };

    let response;
    try {
      response = await inst.addMessage(messageData, ticketData);
      if (session) {
        response.session = session;
      }
      response = Promise.resolve(response)
    } catch (error) {
      response = Promise.reject(error);
    }
    return this.responder(req, reply, response);
    // return this.responder(req, reply, inst.addMessage(messageData, ticketData));
  }

  async addMessage(req, reply) {
    let inst = new ConversationService();
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;
    req.body.userType = UserType.agent;
    return this.responder(req, reply, inst.addMessage(req.body));
  }

  async getConversation(req, reply) {
    let clientId = req.authUser.clientId;
    let workspaceId = req.query.workspace_id;
    let ticketSno = req.params.ticket_sno;
    let user = {
      id: req.authUser.id,
      type: req.authUserType,
    };

    let inst = new ConversationService();
    return this.responder(req, reply, inst.getConversation(ticketSno, workspaceId, clientId, req.query, user));
  }

  async getMessage(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let messageId = req.params.message_id;
    let ticketId = req.params.ticket_id;
    let inst = new ConversationService();
    return this.responder(req, reply, inst.getMessage(messageId, ticketId, workspaceId, clientId));
  }

  async updateMessage(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let createdBy = req.authUser.id;
    let id = req.params.message_id;
    let ticketId = req.params.ticket_id;

    let toUpdate = req.body;
    let inst = new ConversationService();
    return this.responder(req, reply, inst.updateMessage({ id, ticketId, workspaceId, clientId, createdBy }, toUpdate));
  }

  async deleteMessage(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let createdBy = req.authUser.id;
    let id = req.params.message_id;
    let ticketId = req.params.ticket_id;

    let inst = new ConversationService();
    return this.responder(req, reply, inst.deleteMessage({ id, ticketId, workspaceId, clientId, createdBy }));
  }

}

module.exports = ConversationHandler;
