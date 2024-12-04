const Promise = require('bluebird');
const config = require('../../config');
const errors = require('../../errors');
const BaseUtility = require("./BaseUtility");
const UserTokenSchema = require("../schemas/UserTokenSchema");

class UserTokenUtility extends BaseUtility {

    constructor() {
		super(UserTokenSchema);
    }

}

module.exports = UserTokenUtility;