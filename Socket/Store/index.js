// store socket ids in redis
const UserTypeConstant = require('../../constants/ClientConstants').UserType;

class SocketStore {

  constructor() {
    this.AgentWorkSpaceSockets = {};
    this.CustomerWorkSpaceSockets = {};
    this.AgentSockets = {};
    this.CustomersSockets = {};
    this.ServiceSockets = new Set();
  }

  async addSocketInWorkSpace(workspaceId, userType, socketId) {
    if (!workspaceId) {
      console.log("Cant add to socket store without workspace ID.")
      return Promise.resolve();
    }
    let store = this.CustomerWorkSpaceSockets;
    if (userType == UserTypeConstant.agent) {
      store = this.AgentWorkSpaceSockets;
    }
    if (!store[workspaceId]) {
      store[workspaceId] = new Set();
    }
    store[workspaceId].add(socketId);
    return Promise.resolve();
  }

  async addSocket(userId, workspaceId, socketId, userType) {
    if (!workspaceId) {
      console.log("Cant add to socket store without workspace ID.")
      return Promise.resolve();
    }
    let store;
    switch (userType) {
      case UserTypeConstant.agent:
        store = this.AgentSockets;
        break;

      case UserTypeConstant.customer:
        store = this.CustomersSockets;
        break;

      case UserTypeConstant.service:
        this.ServiceSockets.add(socketId);
        return Promise.resolve();
    }

    await this.addSocketInWorkSpace(workspaceId, userType, socketId);
    if (!store[userId]) {
      store[userId] = new Set();
    }
    store[userId].add(socketId);
    return Promise.resolve();
  }

  getUserSockets(userType, userId) {
    let store;
    switch (userType) {
      case UserTypeConstant.agent:
        store = this.AgentSockets;
        break;

      case UserTypeConstant.customer:
        store = this.CustomersSockets;
        break;

      case UserTypeConstant.service:
        return this.ServiceSockets;
    }
    if (!store[userId]) {
      return []
    }
    return store[userId];
  }

  getWorkspaceSockets(userType, workspaceId) {
    let store = this.CustomerWorkSpaceSockets;
    if (userType == UserTypeConstant.agent) {
      store = this.AgentWorkSpaceSockets;
    }
    if (!store[workspaceId]) {
      return []
    }
    return store[workspaceId];
  }


}

let instance = null;
module.exports = () => {
  if (!instance) {
    instance = new SocketStore();
  }
  return instance;
};
