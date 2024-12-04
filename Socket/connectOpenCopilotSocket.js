const socketIOClient = require("socket.io-client"); // Socket.io client library for Pulse to OpenCopilot communication
const logger = require("../logger"); // Assuming you have a logger module to log messages
const EventConstants = require("./EventConstants"); // Import your event constants
const SocketStore = require("./Store")(); // Assuming you have a Store module to manage socket connections

class OpenCopilotSocketConnector {
  constructor() {
    this.socket = null;
  }

  // Initialize the connection to OpenCopilot Socket
  connectToOpenCopilot() {
    // URL of the OpenCopilot Socket server, replace with actual URL
    const opencopilotSocketUrl = "http://localhost:8888";
    // const opencopilotSocketUrl = 'http://host.docker.internal:8888';
    const credentials = {
      autoConnect: true,
      // method:['POST','GET'],
      transports: ["websocket"],
      extraHeaders: {
        "X-Bot-Token": "E2uatOtWzOENqYaq",
        "X-Session-Id": "E2uatOtWzOENqYaq|fz8y1wfovg",
      },
    };
    this.socket = socketIOClient.io(opencopilotSocketUrl, credentials);
    this.socket.on("E2uatOtWzOENqYaq|fz8y1wfovg", (res) => {
      console.log(res);
    });
    this.socket.on("E2uatOtWzOENqYaq|fz8y1wfovg_info", (res) => {
      console.log(res, "info");
    });

    //   this.socket.on('E2uatOtWzOENqYaq|fz8y1wfovg',(res)=>{
    //     console.log(res,"socketResponse")
    //   })
    // Handle successful connection
    this.socket.on("connect", () => {
      this.socket.emit("send_chat", {
        headers: {
          "X-Copilot": "copilot",
        },
        query_params: {},
        content: "list all my tickets just the title",
        bot_token: "E2uatOtWzOENqYaq",
        language: "en",
        from: "user",
        session_id: "E2uatOtWzOENqYaq|fz8y1wfovo",
        id: "yr7ze5",
        timestamp: "3:41 PM",
      });

      console.log("Connected to OpenCopilot Socket server");
    });
    
    // Handle receiving events from OpenCopilot
    this.socket.on(EventConstants.copilotMessage, (data) => {
      logger.info("Received message from OpenCopilot:", data);
      this.handleOpenCopilotMessage(data);
    });

    // Handle socket errors
    this.socket.on("error", (error) => {
      logger.error("Error with OpenCopilot socket connection:", error);
    });

    // Handle disconnection from OpenCopilot
    this.socket.on("disconnect", () => {
      logger.info("Disconnected from OpenCopilot Socket");
    });
  }

  // Send message to OpenCopilot
  sendMessageToOpenCopilot(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
      logger.info(`Sent event ${event} to OpenCopilot with data:`, data);
    } else {
      logger.error("Socket not connected to OpenCopilot");
    }
  }

  // Handle incoming messages from OpenCopilot (you can modify this as per your logic)
  handleOpenCopilotMessage(data) {
    // Here, you could process data from OpenCopilot and maybe trigger events in Pulse
    logger.info("Processing incoming message from OpenCopilot:", data);

    // Example: If it's a 'newTicket' event, pass the data to Pulse
    if (data.event === EventConstants.newTicket) {
      this.onNewTicket(data);
    }
  }

  // Example of handling a new ticket event and emitting to Pulse socket
  onNewTicket(ticketData) {
    // Assuming you have a Pulse socket (Pulse backend)
    const pulseSocket = SocketStore.getPulseSocket(ticketData.workspaceId);

    if (pulseSocket) {
      pulseSocket.emit(EventConstants.newTicket, ticketData); // Emit to Pulse backend
      logger.info(
        `New ticket event emitted to Pulse for workspace ${ticketData.workspaceId}`
      );
    } else {
      logger.error(
        "No Pulse socket found for workspace:",
        ticketData.workspaceId
      );
    }
  }

  // Ensure that if the connector is already initialized, you don't create a new instance
  static getInstance() {
    if (!this.instance) {
      this.instance = new OpenCopilotSocketConnector();
    }
    return this.instance;
  }
}

module.exports = OpenCopilotSocketConnector;
