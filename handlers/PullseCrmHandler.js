const BaseHandler = require('./BaseHandler');
const PullseCrmService = require('../services/PullseCrmService');
class PullseCrmHandler extends BaseHandler {

    constructor() {
        super();
    }

    async createNewUser(req, reply) {
        let inst = new PullseCrmService();
        return this.responder(req, reply, inst.createNewUser(req.body));
    }
}

module.exports = PullseCrmHandler;