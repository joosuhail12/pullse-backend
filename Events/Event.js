const Consumer = require('../Queue/Consumer');
const Publisher = require('../Queue/Publisher');


class EventPublisher extends Publisher {

  constructor() {
    super();
  }

  async publish(event, data) {
    try {
      await this.init(this.queue);
      let message = {
        event,
        data,
        at: new Date()
      };
      let res = await this.sendMessage(message);
      return res;
    } catch (error) {

    }
  }

}

class EventConsumer extends Consumer {

  constructor() {
    super();
    this.EventHandlers = {};
  }

  async start() {
    await this.init(this.queue);
    await inst.listenQueue();
  }

  async messageHandler(message) {
    return this.processMessage(message);
  }

  async processMessage(message) {
    let { event, data, at } = message;
    let receivedAt = new Date();
    let sentAt = new Date(at);
    if (!this.EventHandlers[event]) {
      console.log(message);
      throw new Error(`No handlers for event: ${event}`);
    }
    try {
      let res = await this.EventHandlers[event](data);
      return Promise.resolve(res);
    } catch (error) {
      console.error(error);
      throw new Error(error);
    }
  }

}

module.exports = {
  EventPublisher,
  EventConsumer
};