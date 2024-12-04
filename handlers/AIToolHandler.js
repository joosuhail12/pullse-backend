const LLMServiceExternalService = require("../ExternalService/LLMServiceExternalService");
const ConversationService = require("../services/ConversationService");
const TicketService = require("../services/TicketService");
const TicketEventPublisher = require("../Events/TicketEvent/TicketEventPublisher");

const BaseHandler = require('./BaseHandler');

class AIToolHandler extends BaseHandler {

  constructor() {
    super();
    this.serviceInst = new LLMServiceExternalService();
  }

  async summarizeText(req, reply) {
    let user  = req.authUser;
    let workspaceId = req.query.workspace_id;

    let inst = this.serviceInst
    return this.responder(req, reply, inst.summarize(req.body.text));
  }

  async expandText(req, reply) {
    let user  = req.authUser;
    let workspaceId = req.query.workspace_id;

    let inst = this.serviceInst
    return this.responder(req, reply, inst.expandText(req.body.text));
  }

  async rephraseText(req, reply) {
    let user  = req.authUser;
    let workspaceId = req.query.workspace_id;

    let inst = this.serviceInst
    return this.responder(req, reply, inst.rephraseText(req.body.text));
  }

  async askQuery(req, reply) {
    let user  = req.authUser;
    let workspaceId = req.query.workspace_id;

    let inst = this.serviceInst
    return this.responder(req, reply, inst.askQuery(req.body.query));
  }

  async summarizeConversation(req, reply) {
    let user = req.authUser;
    let clientId = user.clientId;
    let sno = req.body.ticket_sno;
    let workspaceId = req.query.workspace_id;

    // let inst = this.serviceInst
    // let conversationServiceInst = new ConversationService();
    // let conversationText;
    let ticketServiceInst = new TicketService();
    try {
      let ticket = await ticketServiceInst.getDetails(sno, workspaceId, clientId);
      let eventPublisherInst = new TicketEventPublisher();
      await eventPublisherInst.summarizeConversation(ticket, user);
      // conversationText = await conversationServiceInst.getAllMessageOfConversation(ticket.id);
      // to do
    } catch (e) {
      return this.responder(req, reply, Promise.reject(e));
    }
    return this.responder(req, reply, Promise.resolve("Generating conversation summary."));
  }

}

module.exports = AIToolHandler;
