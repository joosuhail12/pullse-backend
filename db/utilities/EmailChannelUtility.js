const EmailChannelSchema = require("../schemas/EmailChannelSchema");
const BaseUtility = require("./BaseUtility");

class EmailChannelUtility extends BaseUtility {
    constructor() {
        super(EmailChannelSchema);
    }
}

module.exports = EmailChannelUtility;
