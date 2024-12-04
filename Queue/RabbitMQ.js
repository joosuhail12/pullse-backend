var amqp = require('amqplib');
const config = require('../config');

class RabbitMQ {

  constructor() {
    this.queue = null;
    this.channel = null;
    this.connection = null;
  }

  async connect() {
    if (!this.connection) {
      try {
        this.connection = await amqp.connect(`amqp://${config.rabbit.host}`);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return Promise.resolve(this.connection);
  }

  async createChannel(connection = null) {
    if (!this.channel) {
      try {
        connection = connection || this.connection;
        this.channel = await connection.createChannel();
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return Promise.resolve(this.channel);
  }

  async init(queue = null, options = { durable: true }) {
    this.queue = queue || this.queue;
    if (!this.queue) {
      return Promise.reject(new Error("Please provide queue."));
    }
    try {
      await this.connect();
      await this.createChannel();
      await this.channel.assertQueue(this.queue, options);
      return Promise.resolve(this.channel);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async sendMessage(messageJSON = {}) {
    try {
      let msgStr = JSON.stringify(messageJSON);
      console.log("[x] Sending msg %s", msgStr);
      return this.channel.sendToQueue(this.queue, Buffer.from(msgStr));
    } catch (error) {
      return Promise.reject(error, messageJSON);
    }
  }

  async listenQueue(options = {}, cb = this.onMessage.bind(this)) {
    console.info("Listening Queue: %s", this.queue);
    try {
      return this.channel.consume(this.queue, cb, options);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async onMessage(msg) {
    let message;
    try {
      let messageContent = msg.content.toString();
      message = JSON.parse(messageContent);
      console.log("[x] Message Received %s", messageContent);
    } catch (error) {
      console.error(error, msg);
    }
    try {
      await this.messageHandler(message);
    } catch (error) {
      console.error(error);
      this.channel.nack(msg);
      return Promise.reject(error);
    }
    this.channel.ack(msg);
    return Promise.resolve();
  }

  messageHandler() {
    return Promise.resolve();
  }

}


module.exports = RabbitMQ;