
const config = require('./config');

const fastify = require('fastify')
const fastifyCors = require("@fastify/cors");
const fastifyIO = require("fastify-socket.io");
const fastifyStatic = require('@fastify/static');
const fileUpload = require('fastify-file-upload')
const formBody = require('@fastify/formbody');
const cookie = require('@fastify/cookie');
// require('dotenv').config();
const Socket = require('./Socket')();
const DecisionEngine = require('./DecisionEngine');
const path = require('node:path');


// const db = require('./db');
const swagger = require('./middlewares/swagger');
const routes = require('./routes');
const caslPlugin = require('./ability/casl');
const supabase = require('./db/supabaseClient');
// const { handleWidgetContactEvent, handleWidgetConversationEvent } = require('./ExternalService/ablyListener');
let app;
const start = async () => {
  try {
    app = fastify({ logger: config.logger.enable, trustProxy: true });
    // console.log(config.db,"config.dbconfig.dbconfig.dbconfig.db")
    // await db.connect(config.db);
    app.register(cookie, {
      secret: "my-secret",
      hook: 'onRequest',
      parseOptions: {}
    });
    await swagger(app);

    await app.register(formBody);
    await app.register(caslPlugin);
    await app.register(fastifyCors, {
      origin: true,// config.app.whitelisted_urls.split(','), // TODO:remove this
      credentials: true,
    });
    await app.register(fastifyIO, {
      cors: {
        // origin: '*',
        origin: true, // config.app.whitelisted_urls.split(','), // TODO:remove this
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

    // handleWidgetContactEvent("3e742e62-1041-4a2b-a85a-8e6a17d60565", "e63d6f79-3966-4716-9231-f4a312e247e1", "6c22b22f-7bdf-43db-b7c1-9c5884125c63");
    // handleWidgetConversationEvent("805d4503-94ce-45d9-bcba-7e4c89bc7120", "e63d6f79-3966-4716-9231-f4a312e247e1", "6c22b22f-7bdf-43db-b7c1-9c5884125c63")

    // name
    await routes.activate(app);
    app.addHook('onResponse', (request, reply, done) => {
      // console.log(reply, ".reply reply reply reply..",);
      // console.log(Object.keys(reply), ".reply reply reply reply..",);

      // console.log(Object.keys(request), ".route route route route..",);
      done()
    })



    app.listen({ port: config.server.port, host: config.server.host });
    await app.ready()
      .then(async () => {
        Socket.init(app.io);
        // let decisionEngine = DecisionEngine(app.io, Socket);
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
