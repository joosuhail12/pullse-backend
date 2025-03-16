const BaseService = require("./BaseService");

class TagHistoryService extends BaseService {
    constructor(fields = null) {
        super();
        this.entityName = "tagHistory";
        this.listingFields = ["id", "tagId", "date", "total", "entityType"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = ["tagId", "date", "total", "entityType"];
    }

    /**
     * Fetches tag counts for tickets, contacts, and companies.
     */
    async getTagCounts(tagId) {
        try {
            const [{ count: ticketCount, error: ticketError },
                { count: contactCount, error: contactError },
                { count: companyCount, error: companyError }] = await Promise.all([
                    this.supabase.from("ticketTags").select("*", { count: "exact", head: true }).eq("tagId", tagId),
                    this.supabase.from("customerTags").select("*", { count: "exact", head: true }).eq("tagId", tagId),
                    this.supabase.from("companyTags").select("*", { count: "exact", head: true }).eq("tagId", tagId)
                ]);
            return {
                tickets: ticketCount ?? 0,
                contacts: contactCount ?? 0,
                companies: companyCount ?? 0,
            };
        } catch (err) {
            return { tickets: 0, contacts: 0, companies: 0 };
        }
    }


    /**
     * Updates tag history when a tag is assigned to an entity.
     * - If a record exists for today, it updates the count.
     * - Otherwise, it inserts a new record.
     */
    async updateTagHistory(tagId, entityType) {
        try {
            const today = new Date().toISOString().split("T")[0];

            // Check if history exists for today and the given entity type
            const { data: existingEntry, error: fetchError } = await this.supabase
                .from(this.entityName)
                .select("id, total")
                .eq("tagId", tagId)
                .eq("date", today)
                .eq("entityType", entityType)
                .single();

            if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

            if (existingEntry) {
                // Update existing entry
                const { error: updateError } = await this.supabase
                    .from(this.entityName)
                    .update({ total: existingEntry.total + 1 })
                    .eq("id", existingEntry.id);
                if (updateError) throw updateError;
            } else {
                // Insert new history entry
                const { error: insertError } = await this.supabase
                    .from(this.entityName)
                    .insert([{ tagId, date: today, total: 1, entityType }]);
                if (insertError) throw insertError;
            }

            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Fetches tag history in the required format.
     */
    async getTagHistory(tagId) {
        try {
            const { data, error } = await this.supabase
                .from(this.entityName)
                .select("date, total, entityType")
                .eq("tagId", tagId)
                .order("date", { ascending: true });

            if (error) throw error;

            return Array.isArray(data) ? data : [];
        } catch (err) {
            return [];
        }
    }

}

module.exports = TagHistoryService;
