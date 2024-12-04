const WebSocket = require('ws'); // The WebSocket client for OpenCopilot

// OpenCopilot WebSocket URL (replace this with the actual URL)
const OPENCOPILOT_WS_URL = 'wss://localhost:8888'; 

let openCopilotSocket = null;
const listeners = [];

// Function to initialize and connect to OpenCopilot WebSocket
function connectToOpenCopilot() {
  // Create the WebSocket connection to OpenCopilot
  openCopilotSocket = new WebSocket(OPENCOPILOT_WS_URL);

  // When connected to OpenCopilot
  openCopilotSocket.on('open', () => {
    console.log('Connected to OpenCopilot WebSocket');
  });

  // When receiving a message from OpenCopilot, forward it to listeners (frontend)
  openCopilotSocket.on('message', (message) => {
    console.log('Received from OpenCopilot:', message);
    listeners.forEach((listener) => listener(message));
  });

  // Error handling for OpenCopilot WebSocket
  openCopilotSocket.on('error', (error) => {
    console.error('OpenCopilot WebSocket Error:', error);
  });

  // When OpenCopilot connection is closed
  openCopilotSocket.on('close', () => {
    console.log('Disconnected from OpenCopilot WebSocket');
  });
}

// Add a listener to receive messages from OpenCopilot and forward to frontend
function addListener(listener) {
  listeners.push(listener);
}

// Send a message to the OpenCopilot WebSocket
function sendToOpenCopilot(message) {
  if (openCopilotSocket && openCopilotSocket.readyState === WebSocket.OPEN) {
    openCopilotSocket.send(message);
  } else {
    console.error('Cannot send message, WebSocket is not open');
  }
}

// Initialize the WebSocket connection to OpenCopilot when the module is loaded
connectToOpenCopilot();

// Add listener for 'send_chat' event
addListener((message) => {
  if (message === 'send_chat') {
    console.log('Chat message received from frontend');
    // Emit 'send_chat' event back to frontend (or handle as needed)
    sendToOpenCopilot('send_chat');
  }
});

// Add listener for specific ID '323232'
addListener((message) => {
  if (message === '323232') {
    console.log('Received ID 323232');
    // Respond or handle ID '323232'
    sendToOpenCopilot('ID 323232 received');
  }
});

// Exporting functions to be used in the main app
module.exports = {
  sendToOpenCopilot,
  addListener
};
