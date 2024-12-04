const ClientSchema = require("../schemas/ClientSchema");
const BaseUtility = require("./BaseUtility");

class ClientUtility extends BaseUtility {
	constructor() {
		super(ClientSchema);
	}
}

module.exports = ClientUtility;
