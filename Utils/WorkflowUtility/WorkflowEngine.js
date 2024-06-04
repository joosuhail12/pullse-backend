const TicketService = require("../../services/TicketService");
const ConversationService = require("../../services/ConversationService");
const EmailService = require("../../services/EmailService");
const UserService = require("../../services/UserService");
const { UserType } = require('../../constants/ClientConstants');
const { MessageType } = require('../../constants/TicketConstants');
const { v4: uuid, validate: uuidValidate } = require('uuid');

class WorkflowEngine {

  constructor() {
  }


  async executeWorkflow(workflow, { ticket, customer, company }) {
    console.log("Executing action for workflow:", workflow, ticket);
    for (let action of workflow.actions) {
      console.log("Execute workflow action: %s", action.type);

      switch (action.type) {

        case "create_ticket":
          await this.createTicket(ticket, action.attributes, action.customAttributes, workflow);
          break;

        case "update_ticket":
          await this.updateTicket(ticket, action.attributes, action.customAttributes, workflow);
          break;

        case "reply_to_customer":
          await this.replyToCustomer({ ticket, customer, company }, action.attributes, action.customAttributes, workflow);
          break;

        case "add_note":
          await this.addNote({ ticket, customer, company }, action.attributes, action.customAttributes, workflow);
          break;

        case "internal_notification":
          await this.internalNotification({ ticket, customer, company }, action.attributes, action.customAttributes, workflow);
          break;

        default:
          break;
        }
    }

  }

  async createTicket(ticket, attributes, customAttributes = {}, workflow) {
    try {
      let { clientId, workspaceId } = ticket;

      let inst = new TicketService();
      attributes.clientId = clientId;
      attributes.ticketCreatedBy = 'workflow';
      attributes.workspaceId = workspaceId;
      attributes.createdBy = workflow.id;
      Object.keys(attributes).forEach((key, value) => {
        if (uuidValidate(key)) {
          customAttributes[key] = value;
          delete attributes[key];
        }
      });
      if (customAttributes) {
        attributes.customFields = customAttributes;
      }
      let newTicket = await inst.createTicket(attributes);
    } catch (error) {
      console.error(error);
    }
  }

  async updateTicket(ticket, attributes, customAttributes, workflow) {
    try {
      let { sno, workspaceId, clientId,  } = ticket;

      let inst = new TicketService();
      Object.keys(attributes).forEach((key, value) => {
        if (uuidValidate(key)) {
          customAttributes[key] = value;
          delete attributes[key];
        }
      });
      if (customAttributes) {
        attributes.customFields = customAttributes;
      }
      await inst.updateTicket({ sno, workspaceId, clientId }, attributes);
    } catch (error) {
      console.error(error);
    }
  }

  async replyToCustomer({ ticket, customer, company }, attributes, customAttributes, workflow) {
    let { message } = attributes;
    try {
      console.log("replyToCustomer", { ticket, customer, company }, attributes, customAttributes, workflow);
      let { clientId, workspaceId } = ticket;
      let conversationServiceInst = new ConversationService();
      await conversationServiceInst.addMessage({ ticketId: ticket.id, message, type: MessageType.text, userType: UserType.workflow, createdBy: UserType.workflow, workspaceId, clientId });
    } catch (error) {
      console.error(error);
    }
  }

  async addNote({ ticket, customer, company }, attributes, customAttributes, workflow) {
    let { message } = attributes;
    try {
      console.log("addNote", { ticket, customer, company }, attributes, customAttributes, workflow);
      let { clientId, workspaceId } = ticket;
      let conversationServiceInst = new ConversationService();
      await conversationServiceInst.addMessage({ ticketId: ticket.id, message, type: MessageType.note, userType: UserType.workflow, createdBy: UserType.workflow, workspaceId, clientId });
    } catch (error) {
      console.error(error);
    }
  }

  async internalNotification({ ticket, customer, company }, attributes, customAttributes, workflow) {
    let { assigneeId, teamId, subject, message } = attributes;
    try {
      console.log("internalNotification", { ticket, customer, company }, attributes, customAttributes, workflow);
      let { clientId, workspaceId } = ticket;
      let userServiceInst = new UserService();
      let assigneeUser = await userServiceInst.getDetails(assigneeId, clientId);
      let cc = [];
      if (teamId) {
        let teamUsers = await userServiceInst.paginate({ teamId, clientId }, false);
        for (let teamUser of teamUsers) {
          cc.push(teamUser.email)
        }
      }
      let emailServiceInst = new EmailService();
      await emailServiceInst.sendEmail({ to: assigneeUser.email, subject, html: message, cc });
    } catch (error) {
      console.error(error);
    }
  }

}

module.exports = WorkflowEngine;
