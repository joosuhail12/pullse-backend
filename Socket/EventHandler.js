const TicketService = require('../services/TicketService');
const ConversationService = require('../services/ConversationService');
const EventConstants = require('./EventConstants');
const UserTypeConstant = require('../constants/ClientConstants').UserType;
const LLMServiceExternalService = require("../ExternalService/LLMServiceExternalService");
const SocketStore = require('./Store')();
const CustomerService = require("../services/CustomerService");
const TagService = require("../services/TagService");

class EventHandler {

  constructor(socket) {
    this.socket = socket;
    this.user = socket.user;
    this.userType = socket.userType;
    this.ticketService = new TicketService();
    this.conversationService = new ConversationService();
    if (this.userType == UserTypeConstant.service) {
      // Service level events
      this.events = {
        [EventConstants.internalEvent]: this.internalEvent.bind(this),
      }
    } else {
      // Agent and customer events
      this.events = {
        [EventConstants.newMessage]: this.onMessage.bind(this),
        [EventConstants.addUser]: this.onAddUser.bind(this),
        [EventConstants.authenticateUser]: this.onAuthenticateUser.bind(this),
        [EventConstants.userLeft]: this.onUserLeft.bind(this),
        [EventConstants.typing]: this.onTyping.bind(this),
        [EventConstants.stopTyping]: this.onStopTyping.bind(this),
        [EventConstants.disconnect]: this.onDisconnect.bind(this),
      };
    }
  }

  bindEvents() {
    Object.keys(this.events).forEach(event => {
      this.socket.on(event, this.events[event]);
    });
    if (this.user) {
      SocketStore.addSocket(this.user.id, this.user.workspaceId, this.socket.id, this.userType); // handle if agent workspaceId is not defined
    }
  }

  // onConnection(socket) {
  // }

  async onMessage({ message, type, workspaceId, ticketId, mentionIds, tagIds }) {
    if (!this.user?.email) {
      return null;
    }
    // this.ticketService
    let sno = ticketId;
    let userType = this.userType;
    if (userType == UserTypeConstant.customer) {
      workspaceId = this.user.workspaceId;
    }
    let ticketService = new TicketService();
    let ticketInst = await ticketService.getDetails(sno, workspaceId, this.user.clientId);

    // to check if ticket customer id is same

    let messageData = {
      ticketId: ticketInst.id,
      userType,
      createdBy: this.socket.username,
      clientId: this.user.clientId,
      createdBy: this.user.id,
      message,
      type,
      workspaceId,
      mentionIds,
      tagIds
    };
    await this.conversationService.addMessage(messageData);
    // let ticketUpdate = {};
    // if (mentionIds) {
    //   ticketUpdate = {
    //     $addToSet: {
    //       mentionIds: { $each: mentionIds }
    //     }
    //   };
    // }

    // ticketUpdate.lastMessage = message;
    // ticketUpdate.lastMessageBy = userType;
    // ticketUpdate.lastMessageAt = new Date();
    // if (userType == UserTypeConstant.agent) {
    //   ticketUpdate.unread = 0;
    // } else {
    //   ticketUpdate['$inc'] = { 'unread': 1 };
    // }
    // await ticketService.updateOne({ id: ticketInst.id }, ticketUpdate);

    // preparing sender list
    // let toSend = SocketStore.getWorkspaceSockets(UserTypeConstant.agent, workspaceId);
    // let customerSockets = SocketStore.getUserSockets(UserTypeConstant.customer, ticketInst.customerId);
    // if (customerSockets && customerSockets.length > 1) {
    //   for (socket of customerSockets) {
    //     if (this.socket.id !== socket) {
    //       toSend.push(socket);
    //     }
    //   }
    // }

    // sending new message event
    // this.socket.to(toSend).emit(EventConstants.newMessage, {
    //   username: this.user.name,
    //   user: this.user.id,
    //   message,
    //   ticketId,
    //   workspaceId,
    //   type,
    //   userType
    // });
    return Promise.resolve();
  }

  async onAddUser(data) {
    console.log("AddUser Event:", data);
    return Promise.resolve();
  }

  async onAuthenticateUser({sessionId}) {
    if (!sessionId || this.userType == UserTypeConstant.agent) {
      return null;
    }
    let customerServiceInst = new CustomerService(null, { TagService });
    let customer = await customerServiceInst.findOne({ "sessions.id": sessionId, workspaceId: this.user.workspaceId, clientId: this.user.clientId });
    if (customer) {
      this.user = customer;
      SocketStore.addSocket(this.user.id, this.user.workspaceId, this.socket.id, this.userType);
    } else {
      throw new Error("Invalid Session Id");
    }
    return Promise.resolve();
  }

  onUserLeft() {
    console.log("User left");
    return Promise.resolve();
  }

  onTyping({ message }) {
    this.socket.to(this.socket.ticketId).emit(EventConstants.typing, {
      username: this.socket.username,
      message,
    });
    return Promise.resolve();
  }

  onStopTyping({ message }) {
    this.socket.to(this.socket.ticketId).emit(EventConstants.stopTyping, {
      username: this.socket.username,
      message,
    });
    return Promise.resolve();
  }

  onDisconnect() {
    // let ticketId = this.socket.ticketId;
    // if (tickets[ticketId]) {
    //   tickets[ticketId].pop(this.socket.username);
    // }
    if (this.socket && this.socket.ticketId) {
      this.socket.to(this.socket.ticketId).emit(EventConstants.userLeft, {
        username: this.socket.username,
        // numUsers: numUsers
      });
    }
    return Promise.resolve();
  }

  internalEvent({ event, data, audiences }) {
    console.log("Internal Event: %s", event, { data });

    // preparing sender list
    let toSend = [];
    for (let audience of audiences) {
      let { id, level, userType } = audience;
      let workspaceSockets = [];
      let agentSockets = [];
      let customerSockets = [];
      if (level == 'workspace' && userType) { // workspace/agent/customer
        workspaceSockets = SocketStore.getWorkspaceSockets(userType, id);
      } else if (level == 'agent') {
        agentSockets = SocketStore.getUserSockets(UserTypeConstant.agent, id);
      } else if (level == 'customer') {
        customerSockets = SocketStore.getUserSockets(UserTypeConstant.customer, id);
      }
      toSend = [...toSend, ...workspaceSockets, ...agentSockets, ...customerSockets];
    }

    console.log("sending event %s to:", event, toSend);
    if (toSend.length) {
      this.socket.to(toSend).emit(event, data);
    }
    return Promise.resolve();
  }

};

module.exports = EventHandler;
