const convict = require("convict");

const globalAdmin = require("./configs/globalAdmin");

// Schema
var config = convict({
	globalAdmin,
});

config.validate({ allowed: "strict" });

module.exports = config._instance;
