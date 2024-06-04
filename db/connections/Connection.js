const Promise = require("bluebird");

class Connection {

	constructor(config) {
		this._config = config || {};
	}

	connectDB() {
		return Promise.reject(new Error("Please set DB connection."));
	}

	disconnectDB() {
		return Promise.reject(new Error("Please set DB connection."));
	}

}

module.exports = Connection;

