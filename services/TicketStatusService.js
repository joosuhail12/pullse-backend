const Promise = require("bluebird");
const errors = require("../errors");
const TicketStatusUtility = require('../db/utilities/TicketStatusUtility');
const BaseService = require("./BaseService");
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const _ = require("lodash");

class TicketStatusService extends BaseService {

    constructor() {
      super();
      this.utilityInst = new TicketStatusUtility();
      this.entityName = 'ticket_status';
      this.supabase = supabase;
  
      // For internal DB query
      this.listingFields = [
        { db: "id", api: "status_id" },
        { db: "name", api: "name" },
        { db: "description", api: "description" },
        { db: "color_tag", api: "color" },
        { db: "primary_status", api: "primary_status" },
        { db: "secondary_status", api: "secondary_status" },
        { db: "emoji", api: "emoji" },
        { db: "label_id", api: "id" },
        { db: "order", api: "order" },
        { db: "created_at", api: "created_at" }
        // Not exposing `type`, `created_at`, etc.
      ];
      this.entityPriorityName = 'ticket_priority';

    // Field mapping: db → api
    this.listingPriorityFields = [
      { db: 'id', api: 'id' },
      { db: 'name', api: 'name' },
      { db: 'color', api: 'color' },
      { db: 'emoji', api: 'emoji' },
      { db: 'description', api: 'description' },
      { db: 'is_default', api: 'isDefault' },
      { db: 'is_system_priority', api: 'isSystemPriority' },
      { db: 'order', api: 'order' }
    ];
  
      this.updatableFields = ["name", "type", "description", "archived"];
    }
  
    /**
     * Formats a DB row into the desired response shape
     */
    formatRecord(dbRow, index) {
      const record = {};
  
      // Map fields
      this.listingFields.forEach(({ db, api }) => {
        record[api] = dbRow[db];
      });
  
      // Append order
      record.order = index + 1;
  
      // Compute isSystemType from boolean flags
      record.isSystemType = Boolean(dbRow.primary_status || dbRow.secondary_status);
  
      return record;
    }
    

    formatStatusRecord(dbRow, index) {
      const record = {};
      record.name = dbRow.name;
      record.color = dbRow.color_tag;
      record.emoji = dbRow.emoji;
      record.order = dbRow.order;
      record.created_at = dbRow.created_at;
      record.isDefault = Boolean(dbRow.primary_status);
      record.isSystemStatus = !Boolean(!dbRow.primary_status || dbRow.secondary_status);
      record.id = dbRow.id;
      record.statusTypeId = dbRow.label_id;
      return record;
    }
  
    /**
     * Return a formatted list of ticket statuses
     */
    async listAllType(workspaceId, clientId) {
      try {
        const query = { workspaceId, clientId };
        const { data: dbResults, error: dbError } = await this.supabase.from(this.entityName).select(`*`)
        .eq('workspace_id', workspaceId)
        .eq('client_id', clientId)
        .eq('primary_status', true)
        .eq('secondary_status', false)
        .order('order', { ascending: true });
        if (dbError) {
            return this.handleError(dbError);
        }
        return dbResults.map((record, index) => this.formatRecord(record, index));
      } catch (err) {
        console.log("errorXXXXXXXXXXXXXXXXXXXXX", err)
        return this.handleError(err);
      }
    }


    async getTicketVisibilitySettings(workspaceId, clientId) {
      try {
        console.log("workspaceIdXXXXXXXXXXXXXXXXXXXXX", workspaceId, clientId)
        const { data: dbResults, error: dbError } = await this.supabase.from("ticket_settings").select(`*`)
        .eq('workspace_id', workspaceId)
        .eq('client_id', clientId)
        if (dbError) {
            return this.handleError(dbError);
        }
        console.log("dbResultsXXXXXXXXXXXXXXXXXXXXX", dbResults)
        return dbResults[0];
      } catch (err) {
        return this.handleError(err);
      }
    }


    formatPriorityRecord(record) {
        const formatted = {};
        this.listingPriorityFields.forEach(({ db, api }) => {
          if (record[db] !== undefined) {
            formatted[api] = record[db];
          }
        });
    
        return formatted;
      }
    
      /**
       * Returns all ticket priorities sorted by order
       */
    async listAllTicketPriority() {
        try {
            const { data: dbResults, error: dbError } = await this.supabase
            .from(this.entityPriorityName)
            .select('*')
            .order('order', { ascending: true });

            if (dbError) {
                return this.handleError(dbError);
            }

            return dbResults.map((record) => this.formatPriorityRecord(record));
        } catch (err) {
            return this.handleError(err);
        }
    }
    

    async listAllSecondary(workspaceId, clientId) {
      try {
        const query = { workspaceId, clientId };
        const { data: dbResults, error: dbError } = await this.supabase.from(this.entityName).select(`*`)
        .eq('workspace_id', workspaceId)
        .eq('client_id', clientId)
        .order('order', { ascending: true });
        if (dbError) {
            return this.handleError(dbError);
        }
        return dbResults.map((record, index) => this.formatStatusRecord(record, index));
      } catch (err) {
        return this.handleError(err);
      }
    }

    async createTicketStatus(ticketStatusData) {
        try {
            let { name, clientId, workspaceId } = ticketStatusData;
            let ticketStatus = await this.findOne({ name: { $ilike: `%${name}%` }, clientId, workspaceId });
            if (!_.isEmpty(ticketStatus)) {
                return Promise.reject(new errors.AlreadyExist(`${this.entityName} already exists.`));
            }
            return this.create(ticketStatusData);
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getDetails(id, workspaceId, clientId) {
        try {
            let ticketStatus = await this.findOne({ id, workspaceId, clientId });
            if (_.isEmpty(ticketStatus)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }
            return ticketStatus;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateTicketStatus({ id, workspaceId, clientId }, updateValues) {
        try {
            let ticketStatus = await this.getDetails(id, workspaceId, clientId);
            await this.update({ id: ticketStatus.id }, updateValues);
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

    async deleteTicketStatus({ id, workspaceId, clientId }) {
        try {
            let ticketStatus = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(ticketStatus.id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, archived, workspaceId, clientId }) {
        let filters = { workspaceId, clientId };

        if (name) {
            filters.name = { $ilike: `%${name}%` };
        }

        if (archived) {
            filters.archiveAt = { $ne: null };
        }

        if (createdFrom) {
            filters.createdAt = { $gte: createdFrom };
        }
        if (createdTo) {
            filters.createdAt = { ...filters.createdAt, $lte: createdTo };
        }

        return filters;
    }
}

module.exports = TicketStatusService;
