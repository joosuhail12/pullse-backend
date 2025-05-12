// serviceBusClient.js
const { ServiceBusClient } = require("@azure/service-bus");

const connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;
const queueName = 'embedding-pipeline-dev';

  async function sendTaskMessage(blobUrl, title, description, content, type) {
  const sbClient = new ServiceBusClient(connectionString);
  const sender = sbClient.createSender(queueName);


  // 3. Prepare your message payload
  //    - org_id and filename as strings
  //    - file_base64: base64‐encoded file contents
 
  const messagePayload = {
    type        : type,   
    title    : title,
    content   : content,
    uri   : blobUrl,
    doc_id         : "pullse",
  };

  try {
    // 4. Send a single message whose body is your JSON payload
    await sender.sendMessages({ body: JSON.stringify(messagePayload) });
    console.log(`Message sent to queue "${JSON.stringify(messagePayload)}"`);
  } catch (err) {
    console.error("Error while sending message:", err);
  } finally {
    // 5. Always close the sender and client
    await sender.close();
    await sbClient.close();
  }
}

module.exports = { sendTaskMessage };
