const Promise = require("bluebird");
const mongoose = require("mongoose");
const Connection = require("./Connection");
const logger = require('../../logger');

mongoose.set('debug', true);

class MongoConnection extends Connection {

	constructor(config) {
		super(config);
	}

	connectDB() {
		return this.connectMongoDB()
		.then(connection => {
			this._connection = connection;
			return Promise.resolve(this._connection);
		})
		.catch(logger.error);
	}

	disconnectDB() {
		return mongoose.connection.close();
	}

	async connectMongoDB() {
		try {
			let options = this._config.options || {};
			options.autoIndex = true;
			// options.useCreateIndex = true;
			// options.useNewUrlParser = true;
			// options.useFindAndModify = false;
			let hostURL = `${this._config.db_host}/${this._config.db_name}`;
			if(this._config.is_auth_enable) {
				options.authSource = this._config.db_auth_source;
				hostURL = `${this._config.db_user}:${this._config.db_pass}@${hostURL}?authSource=${this._config.db_auth_source}`;
			}
			let mongoDbURL = `${this._config.db_protocol}://${hostURL}`;

			this.attachEvents();
			return mongoose.connect(mongoDbURL, options);
		} catch (err) {
			logger.error({ err }, "Error in mongo DB connection.");
			throw err;
		}
	}

	attachEvents() {
		let connection = mongoose.connection;
		connection.on("connected", () => {
			logger.info("DB Connected");
		});

		connection.on("disconnected", (err) => {
			logger.info("DB disconnected", err);
		});

		connection.on("close", () => {
			logger.info("DB connection close");
		});

		connection.on("reconnected", () => {
			logger.info("DB reconnected");
		});

		connection.on("reconnected", () => {
			logger.info("DB reconnected");
		});

		connection.on("error", (err) => {
			logger.info("DB connection error", err);
		});
	}
}

module.exports = MongoConnection;
