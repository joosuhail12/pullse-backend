const BaseHandler = require('./BaseHandler');
const TicketService = require('../services/TicketService');
const ConversationService = require('../services/ConversationService');


class TicketHandler extends BaseHandler {

  constructor() {
    super();
    this.ticketServiceInst = new TicketService(null, { ConversationService });
  }

  async createTicket(req, reply) {
    let inst = this.ticketServiceInst;
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;
    req.body.createdBy = req.authUser.id;
    return this.responder(req, reply, inst.createTicket(req.body));
  }


  async listCustomerTickets(req, reply) {
    if (!req.authUser?.email || !req.authUser?.sessionId || !req.authUser?.id) {
      return this.responder(req, reply, Promise.resolve([]));
    }
    req.query.workspace_id = req.authUser.workspaceId;
    req.query.customer_id = req.authUser.id;
    req.query.session_id = req.authUser.sessionId;
    return this.listTickets(req, reply);
  }

  async listTickets(req, reply) {
    let inst = this.ticketServiceInst;
    req.query.user_id = req.authUser.id;
    req.query.session_id = req.authUser.sessionId;
    req.query.client_id = req.authUser.clientId;
    let filters = {
      status: req.query.status,
      teamId: req.query.team_id,
      typeId: req.query.type_id,
      companyId: req.query.company_id,
      userId: req.query.user_id,
      assigneeId: req.query.assignee_id,
      createdFrom: req.query.created_from,
      createdTo: req.query.created_to,
      priority: req.query.priority,
      workspaceId: req.query.workspace_id,
      externalId: req.query.external_id,
      tagId: req.query.tag_id,
      mentionId: req.query.mention_id,
      sessionId: req.query.session_id,
      topicId: req.query.topic_id,
      language: req.query.language,
      skip: parseInt(req.query.skip) || 0,
      limit: parseInt(req.query.limit) || 10,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      clientId: req.query.client_id
    };
    return this.responder(req, reply, inst.listTickets(filters));
  }

  async showTicketDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let sno = req.params.ticket_sno;

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.getDetails(sno, workspaceId, clientId, true));
  }

  async updateTicket(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    // Check for ticket identifiers in different possible parameters
    let id = req.params.ticket_id;
    let sno = req.params.ticket_sno;

    if (!id && !sno) {
      return this.responder(req, reply, Promise.reject(new Error('Ticket ID or SNO is required')));
    }


    let toUpdate = req.body;
    // Add updatedBy from authenticated user
    toUpdate.updatedBy = req.authUser.id;

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.updateTicket({ id, sno, workspaceId, clientId }, toUpdate));
  }

  async updateTag(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let sno = req.params.ticket_sno;
    let entityType = req.params.entity_type;


    let entityId = req.body.entity_id;
    let action = req.body.action;

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.attachTagOrTopic({ sno, workspaceId, clientId }, entityType, entityId, action));
  }

  async deleteTicket(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;
    let sno = req.params.ticket_sno;

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.deleteTicket({ sno, workspaceId, clientId }));
  }

  async assignTicket(req, reply) {
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;

    // Check for ticket identifiers in different possible parameters
    const id = req.params.ticket_id;
    const sno = req.params.ticket_sno;

    if (!id && !sno) {
      return this.responder(req, reply, Promise.reject(new Error('Ticket ID or SNO is required')));
    }

    // Check for userId in multiple possible fields
    const userId = req.body.userId || req.body.assignTo || req.body.assignedTo;

    if (!userId) {
      return this.responder(req, reply, Promise.reject(new Error('User ID is required. Please provide userId, assignTo, or assignedTo.')));
    }

    // Add updatedBy to track who performed the assignment
    const assignmentData = {
      ...req.body,
      updatedBy: req.authUser.id
    };

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.assignTicketToUser(id, sno, userId, workspaceId, clientId, assignmentData));
  }
  // get conversation by ticket id
  async getConversationByTicketId(req, reply) {
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;
    const sno = req.params.ticket_sno;
    const sessionId = req.authUser.sessionId;
    const userId = req.authUser.id;

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.getConversationByTicketId(sno, workspaceId, clientId, sessionId, userId));
  }

  async getUnassignedTickets(req, reply) {
    let filters = {
      status: req.query.status,
      priority: req.query.priority,
      workspaceId: req.query.workspace_id,
      skip: parseInt(req.query.skip) || 0,
      limit: parseInt(req.query.limit) || 10,
      clientId: req.authUser.clientId,
      userId: req.authUser.id
    };

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.getUnassignedTickets(filters));
  }

  async getAssignedTickets(req, reply) {
    const userId = req.params.user_id;

    if (!userId) {
      return this.responder(req, reply, Promise.reject(new Error('User ID is required')));
    }

    let filters = {
      status: req.query.status,
      priority: req.query.priority,
      workspaceId: req.query.workspace_id,
      skip: parseInt(req.query.skip) || 0,
      limit: parseInt(req.query.limit) || 10,
      clientId: req.authUser.clientId
    };

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.getAssignedTickets(userId, filters));
  }

  async assignTicketToTeam(req, reply) {
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;

    // Check for ticket identifiers in different possible parameters
    const id = req.params.ticket_id;
    const sno = req.params.ticket_sno;

    if (!id && !sno) {
      return this.responder(req, reply, Promise.reject(new Error('Ticket ID or SNO is required')));
    }

    // Check for teamId in request body
    const teamId = req.body.teamId;

    if (!teamId) {
      return this.responder(req, reply, Promise.reject(new Error('Team ID is required')));
    }

    // Add updatedBy to track who performed the team assignment
    const assignmentData = {
      ...req.body,
      updatedBy: req.authUser.id
    };

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.assignTicketToTeam(id, sno, teamId, workspaceId, clientId, assignmentData));
  }

  // New dedicated method for team assignment routes
  async assignTeam(req, reply) {
    return this.assignTicketToTeam(req, reply);
  }

  async listBotTickets(req, reply) {
    let inst = this.ticketServiceInst;
    req.query.workspace_id = req.query.workspace_id || req.authUser.workspaceId;
    let filters = {
      status: req.query.status,
      teamId: req.query.team_id,
      typeId: req.query.type_id,
      priority: req.query.priority,
      workspaceId: req.query.workspace_id,
      skip: req.query.skip,
      limit: req.query.limit,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      clientId: req.authUser.clientId
    };
    return this.responder(req, reply, inst.listBotTickets(filters));
  }

  // Ticket Tags Handler Methods using ticketTags table

  async getTicketTagsById(req, reply) {
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;
    const ticketId = req.params.ticket_id;

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.getTicketTagsById(ticketId, workspaceId, clientId));
  }

  async updateTicketTagsById(req, reply) {
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;
    const ticketId = req.params.ticket_id;
    const { tagIds } = req.body;

    let inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.updateTicketTagsById(ticketId, tagIds, workspaceId, clientId, req.authUser.id));
  }

  // Ticket Teams Handler Methods
  async getTicketTeamsById(req, reply) {
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;
    const ticketId = req.params.ticket_id;

    const inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.getTicketTeamsById(ticketId, workspaceId, clientId));
  }

  async updateTicketTeamsById(req, reply) {
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;
    const ticketId = req.params.ticket_id;
    const { teamIds } = req.body;

    const inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.updateTicketTeamsById(ticketId, teamIds, workspaceId, clientId, req.authUser.id));
  }

  async rewriteTicketText(req, reply) {
    const workspaceId = req.query.workspace_id;
    const clientId = req.authUser.clientId;
    const ticketId = req.params.ticket_id;
    const { text, tool, tone } = req.body;

    const inst = this.ticketServiceInst;
    return this.responder(req, reply, inst.rewriteTicketText(ticketId, text, tool, tone, workspaceId, clientId));
  }
}

module.exports = TicketHandler;
