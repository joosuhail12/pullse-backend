const RabbitMQ = require('./RabbitMQ');

class Publisher extends RabbitMQ {

  constructor() {
    super();
  }

}


module.exports = Publisher;


// (async () => {
//   let inst = new Publisher();
//   await inst.init('tasks')
//   sno = 1;
//   setInterval(() => {
//     inst.sendMessage({ sno, message: "hello"});
//     sno++;
//   }, 1500);
// })()