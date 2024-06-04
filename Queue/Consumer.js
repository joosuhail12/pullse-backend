const RabbitMQ = require('./RabbitMQ');

class Consumer extends RabbitMQ {

  constructor() {
    super();
  }

}


module.exports = Consumer;

// (async () => {
//   let inst = new Consumer();
//   await inst.init(' tasks')

//   inst.listenQueue();
// })()