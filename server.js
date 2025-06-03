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
const Ably = require('ably');

// const db = require('./db');
const swagger = require('./middlewares/swagger');
const routes = require('./routes');
const caslPlugin = require('./ability/casl');
const supabase = require('./db/supabaseClient');
const TimelineListener = require('./db/timelineListener');

let app;
let timelineListener;

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

    await routes.activate(app);

    // Initialize timeline listener after app is ready
    timelineListener = new TimelineListener();
    timelineListener.init();

    app.addHook('onResponse', (request, reply, done) => {
      // console.log(reply, ".reply reply reply reply..",);
      // console.log(Object.keys(reply), ".reply reply reply reply..",);

      // console.log(Object.keys(request), ".route route route route..",);
      done()
    })
    const ably = new Ably.Realtime(process.env.ABLY_API_KEY);
    ably.connection.on('connected', () => {
      console.log('Ably connected, starting listeners...');
      // init(ably, supabase, InternalService);
    });



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
