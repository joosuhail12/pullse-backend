const convict = require("convict");

const app = require("./configs/app");
const auth = require('./configs/auth');
const db = require("./configs/db");
const server = require("./configs/server");
const logger = require('./configs/logger');
const smtp = require('./configs/smtp');
const llm = require('./configs/llm');
const socket = require("./configs/socket");
const rabbit = require("./configs/rabbit");

// Schema
var config = convict({
	app,
	auth,
	server,
	logger,
	db,
	smtp,
	llm,
	socket,
	rabbit
});

config.validate({ allowed: "strict" });

module.exports = config._instance;
