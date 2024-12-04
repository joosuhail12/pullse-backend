const config = require('./config');

const fastify = require('fastify')
const fastifyCors = require("@fastify/cors");
const fastifyIO = require("fastify-socket.io");
const fastifyStatic = require('@fastify/static');
const fileUpload = require('fastify-file-upload')
const formBody = require('@fastify/formbody');
const cookie = require('@fastify/cookie');

const Socket = require('./Socket')();
const DecisionEngine = require('./DecisionEngine');
const path = require('node:path');


const db = require('./db');
const swagger = require('./middlewares/swagger');
const routes = require('./routes');
const caslPlugin = require('./ability/casl');

let app;
const start = async () => {
  try {
    app = fastify({ logger: config.logger.enable });
    await db.connect(config.db);
    app.register(cookie, {
      secret: "my-secret",
      hook: 'onRequest',
      parseOptions: {}
    });
    await swagger(app);

    await app.register(formBody);
    await app.register(caslPlugin);
    await app.register(fastifyCors, {
      origin: config.app.whitelisted_urls.split(','),
      credentials: true,
    });
    await app.register(fastifyIO, {
      cors: {
        origin:'*',
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      }
    });


    await app.register(fastifyStatic, {
      root: path.join(__dirname, 'public'),
      prefix: '/public/',
    });
    await app.register(fileUpload, {
      debug: true,
      useTempFiles: true,
      // tempFileDir: "",
      safeFileNames: true,
      preserveExtension: true,
      limits: {
        fileSize: 50 * 1024 * 1024
      },
      // limitHandler: (req, res, next) => { next(); }
    });

    // name
    await routes.activate(app);
    app.addHook('onResponse', (request, reply, done) => {
      console.log(request.hasOwnProperty('Context'), ".request request request request..",);
      // console.log(reply, ".reply reply reply reply..",);
      // console.log(Object.keys(reply), ".reply reply reply reply..",);

      // console.log(Object.keys(request), ".route route route route..",);
      done()
    })



    app.listen({ port: config.server.port, host: config.server.host});
    await app.ready()
    .then(async () => {
      Socket.init(app.io);
      let decisionEngine = DecisionEngine(app.io, Socket);
      return Socket;
    });
    app.swagger({
      tags: [
        { name: 'test', description: 'dummy' },
      ]
    });

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}


start();
