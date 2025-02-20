const _ = require("lodash");
const Promise = require("bluebird");
const DemoRequestUtility = require('../db/utilities/DemoRequestUtility');
const BaseService = require("./BaseService");
const errors = require("../errors");

class DemoRequestService extends BaseService {

    constructor() {
        super();
        this.entityName = "DemoRequest";
        this.utilityInst = new DemoRequestUtility();
        this.listingFields = [ "id", "name", "email", "count", "description", "status", "createdAt", "updatedAt", "-_id" ];
        this.updatableFields = [ "count", "name", "description", ];
    }


    async createDemoRequest({ name, email, description=null, }) {
        try {
            let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
            if (!email.match(emailRegex)) {
                return Promise.reject(new errors.BadRequest("Invalid E-mail."));
            }
            let demoRequest = await this.findOne({ email });

            if (!demoRequest) {
                let data = {};
                data.name = name;
                data.email = email;
                data.count = 1;
                data.description = description || null;
                return this.create(data)
                .catch(err => {
                    if (err instanceof errors.Conflict) {
                        return new errors.Conflict("DemoRequest already exist.");
                    }
                    return Promise.reject(err);
                });
            }

            let id = demoRequest.id;
            let count = 0;
            if (demoRequest.count) {
                count = demoRequest.count;
            }
            count++;
            await this.updateOne({ id }, { count });

            if (count == 1) {
                // sending notification if need
            }

            return { id, count };
        } catch(err) {
            return this.handleError(err);
        }
    }

    async deleteDemoRequest(id) {
        try {
            let res = await this.softDelete(id);
            return res;
        } catch(err) {
            return this.handleError(err);
        }
    }

}

module.exports = DemoRequestService;
