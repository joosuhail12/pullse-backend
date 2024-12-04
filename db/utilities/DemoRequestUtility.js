const DemoRequestSchema = require("../schemas/DemoRequestSchema");
const BaseUtility = require("./BaseUtility");

class DemoRequestUtility extends BaseUtility {
	constructor() {
		super(DemoRequestSchema);
	}
}

module.exports = DemoRequestUtility;
