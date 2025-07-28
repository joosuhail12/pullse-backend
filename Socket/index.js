const IO = require('socket.io')
const EventHandler = require('./EventHandler');
const AuthType = require("../constants/AuthType");
const errors = require('../errors');
const authMiddlewares = require('../middlewares/auth');
const { verifyUserToken } = require('../middlewares/clerkAuth');
const logger = require('../logger');
class Socket {

  constructor() {
    this.io = null;
  }

  init(io) {
    this.io = io;
    this.io.on('connection', async (socket) => {
      logger.info("New Socket Request");
      // console.log("New Socket Request--------------------", socket.handshake.headers);
      let authenticated = false

      // check client's allowed origin using socket.handshake.headers.origin

      if (!socket.handshake.query || !socket.handshake.query.token || !socket.handshake.query.userType) {
        logger.info("New Socket Request discarded due to missing token or userType");
        return socket.disconnect();
      }

      let userType = socket.handshake.query.userType;
      let token = socket.handshake.query.token;
      if ([AuthType.agent, AuthType.user].includes(userType) && !socket.handshake.query.workspace_id) {
        logger.info("Agent Socket Request discarded due to missing workspace_id");
        return socket.disconnect();
      }

      let user;
      try {
        switch (userType) {
          case AuthType.client:
            user = await authMiddlewares.verifyClientToken(token);
            break;

          case AuthType.customer:
            user = await authMiddlewares.verifyCustomerToken(token);
            break;


          case AuthType.service:
            user = { userType: AuthType.service };
            break;

          case AuthType.agent:
          case AuthType.user:
          default:
            user = await verifyUserToken(token);
            if (user) {
              user.workspaceId = socket.handshake.query.workspace_id;
            }
            break;

        }
      } catch (error) {
        console.log("Error in socket", error);
        socket.emit('error', {
          error_code: "authentication_failed",
          error: "Authentication Failed",
          message: "Unauthorized Request",
        });
        return socket.disconnect();
      }
      if (user) {
        authenticated = true
      }
      socket.user = user;
      socket.userType = userType;
      if (authenticated) {
        let eventHandler = new EventHandler(socket);
        logger.info("Socket Request Authorized");
        eventHandler.bindEvents();
      } else {
        socket.emit('error', {
          error_code: "authentication_failed",
          error: "Authentication Failed",
          message: "Unauthorized Request",
        });
        logger.info("Unauthorized Socket Request");
        return socket.disconnect();
      }
    });
  }

  // addUser(ticketId) {
  //   this.socket.to(ticketId).emit('new message', {
  //     username: socket.username,
  //     message: message,
  //     ticketId
  //   });
  //   let ticketId = this.socket.ticketId;
  // }

  // newMessage({ticketId, message}) {
  //   this.socket.to(ticketId).emit('new message', {
  //     username: socket.username,
  //     message: message,
  //     ticketId
  //   });
  // }

  // newMessage({ticketId, message}) {
  //   let ticketId = this.socket.ticketId;
  //   this.socket.to(ticketId).emit('new message', {
  //     username: socket.username,
  //     message: message,
  //     ticketId
  //   });
  // }

}

let SocketInst;
module.exports = () => {
  if (!SocketInst) {
    logger.info('Creating new instance of Socket');
    SocketInst = new Socket();
  } else {
    logger.info('Using existing instance of Socket');
  }
  return SocketInst;
}