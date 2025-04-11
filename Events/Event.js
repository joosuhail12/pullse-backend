const Consumer = require('../Queue/Consumer');
const Publisher = require('../Queue/Publisher');
const TriggerCatalog = require('./TriggerCatalog');

class EventPublisher extends Publisher {

  constructor() {
    super();
  }

  async publish(triggerId, data) {
    try {
      await this.init(this.queue);
      console.log("this.queue", this.queue);
      const isKnown = TriggerCatalog.isValidTrigger(triggerId);
      const message = {
        event_type: triggerId,
        at: new Date(),
        data,
        delay: 300
      };

      // If known trigger, add additional fields for rule engine
      if (isKnown) {
        message.event_type = TriggerCatalog.getEventTypeByTriggerId(triggerId); // e.g., "ticket.created"
        message.entity_type = TriggerCatalog.getEntityTypeByTriggerId(triggerId); // e.g., "ticket", "conversation"
      }

      return await this.sendMessage(message);
    } catch (error) {
      console.error('Event publish failed:', error);
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
  EventConsumer,
};