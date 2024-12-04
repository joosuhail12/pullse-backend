const { io } = require("socket.io-client");
const config = require("../../config");
const AuthType = require("../../constants/AuthType");

class SocketClient {

  constructor() {
    this.socket = null;
  }

  connect() {
    let socket = io.connect(config.socket.server_url, {
      query: {
        token: config.socket.token,
        userType: AuthType.service
      },
    });

    socket.on("connect", () => {
      console.log("Connect", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Disconnect", socket.id);
    });

    this.socket = socket;
    return Promise.resolve(socket);
  }

  sendEvent(event, data, audiences) {
    this.socket.emit("internal_event", { event, data, audiences});
    console.log("emit internal event");
  }

}


let instance;
module.exports = () => {
  if (!instance) {
    instance = new SocketClient();
  }
  return instance;
};


// Example Code
// instance.connect()
// setInterval(async () => {
//   instance.sendEvent("new ticket", { ticket: {} }, [
//     { level: 'workspace', userType: 'agent', id: "42da41d7-a0e5-4323-a35c-af41bad764e3" },
//     { level: 'workspace', userType: 'customer', id: "id", },
//     { level: 'agent', userType: null, id: "id", },
//     { level: 'customer', userType: null, id: "id", },
//   ]);
// }, 1500);
