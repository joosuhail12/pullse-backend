const Promise = require("bluebird");
const errors = require("../errors");
const TicketTopicUtility = require('../db/utilities/TicketTopicUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");
const { createClient } = require("@supabase/supabase-js");

class TicketTopicService extends BaseService {

    constructor() {
        super();
        this.utilityInst = new TicketTopicUtility();
        this.entityName = 'tickettopic';
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.listingFields = ["id", "name", "description", "created_at", "updated_at"];
        this.updatableFields = ["name", "description", "archiveAt"];
    }

    async createTicketTopic(data) {
        try {
            let { name, workspaceId, clientId } = data;

            // 🔹 Step 1: Check if a topic with the same name (case-insensitive) exists
            let { data: existingTopic, error: findError } = await this.supabase
                .from("tickettopic")
                .select("*")
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .ilike("name", name) // ✅ Case-insensitive match

                .maybeSingle();

            if (findError) throw findError;

            if (existingTopic) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} with name "${name}" already exists.`));
            }


            // 🔹 Step 2: Insert new topic
            let { data: newTopic, error: insertError } = await this.supabase
                .from("tickettopic")
                .insert([data])
                .select()
                .single(); // ✅ Ensures we get the inserted record

            if (insertError) throw insertError;

            return newTopic;
        } catch (err) {
            return this.handleError(err);
        }
    }


    async updateTicketTopic(ticket_topic_id, updateValues) {
        try {
            await this.update({ id: ticket_topic_id }, updateValues);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteTicketTopic(id) {
        try {
            let res = await this.softDelete(id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, archived, createdFrom, createdTo, clientId }) {
        let filters = { clientId };

        if (name) {
            filters.name = { $regex: `^${name}`, $options: "i" };
        }

        if (archived) {
            filters.archiveAt = { $ne: null };
        }
        if (createdFrom) {
            if (!filters.createdAt) {
                filters.createdAt = {};
            }
            filters.createdAt['$gte'] = createdFrom;
        }
        if (createdTo) {
            if (!filters.createdAt) {
                filters.createdAt = {};
            }
            filters.createdAt['$lt'] = createdTo;
        }

        return filters;
    }
}

module.exports = TicketTopicService;
