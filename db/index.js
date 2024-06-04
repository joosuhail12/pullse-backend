const MongoConnection = require("./connections/MongoConnection");
const { Promise } = require("bluebird");


class DB {
	connect(config) {
		this.dbInst = new MongoConnection(config);
		return this.dbInst.connectDB();
	}
	disconnect() {
		return Promise.resolve(this.dbInst.disconnectDB());
	}
}

module.exports = new DB;

