const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const CompanyService = require("./CompanyService");
const TagService = require("./TagService");
const CSVHandler = require('../FileManagement/CSVFileSystem');
const { CustomerEventPublisher } = require("../Events/CustomerEvent");

class CustomerService extends BaseService {
    constructor(fields = null, dependencies = {}) {
        super();
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.entityName = "customers";
        this.TagService = dependencies.TagService;
        this.listingFields = ["id", "firstname", "lastname", "email", "type", "title", "externalId", "language", "companyId", "status", "department", "timezone", "linkedin", "twitter", "source", "assignedTo", "accountValue", "tagIds", "notes", "lastContacted", "created_at", "updated_at", "street", "city", "state", "postalCode", "country", "companies(name)"];
        if (fields) {
            this.listingFields = fields;
        }
        this.updatableFields = ["firstname", "lastname", "email", "type", "title", "workPhone", "phone", "phoneCountry", "externalId", "twitter", "linkedin", "timezone", "language", "address", "about", "notes", "companyId", "sessions", "tagIds", "lastActiveAt", "archiveAt", "status", "department", "source", "assignedTo", "accountValue", "lastContacted", "street", "city", "state", "postalCode", "country"];
    }

    async findOrCreateCustomer(customerData = {}) {
        try {
            const { email, workspaceId, clientId } = customerData;
            let { data: customer, error } = await this.supabase.from(this.entityName).select("*").eq('email', email).eq('workspaceId', workspaceId).eq('clientId', clientId).single();
            if (error && error.code !== "PGRST116") throw error;
            if (!customer) {
                let { data, error: insertError } = await this.supabase.from(this.entityName).insert([customerData]).select().single();
                if (insertError) throw insertError;
                customer = data;
                let inst = new CustomerEventPublisher();
                await inst.created(customer);
            }
            let customers = await this.getCustomers(workspaceId, clientId);
            return customers;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async importCustomerData({ fileSrc, workspaceId, clientId, createdBy }) {
        try {
            let inst = new CSVHandler();
            let companyServiceInst = new CompanyService();
            let rowCount = 0;
            let errorRows = [];
            await inst.getData(fileSrc, async (row) => {
                rowCount++;
                let company = await companyServiceInst.createCompany(row.company);
                let customerData = {
                    workspaceId, clientId, createdBy,
                    name: row.name,
                    email: row.email,
                    type: row.type,
                    phone: row.phone,
                    phoneCountry: row.phoneCountry,
                    companyId: company.id,
                };
                return this.findOrCreateCustomer(customerData);
            });

            return { total: rowCount, errorRows };
        } catch (err) {
            return this.handleError(err);
        }
    }

    // async updateCustomer({ id, workspaceId, clientId }, updateValues) {
    //     try {
    //         let { error } = await this.supabase.from(this.entityName).update(updateValues).eq('id', id).eq('workspaceId', workspaceId).eq('clientId', clientId);
    //         if (error) throw error;
    //         let inst = new CustomerEventPublisher();
    //         await inst.updated(id, updateValues);
    //         return this.getCustomers();
    //     } catch (err) {
    //         return this.handleError(err);
    //     }
    // }

    async deleteCustomer({ id, workspaceId, clientId }) {
        try {
            let { error } = await this.supabase.from(this.entityName).update({ archiveAt: new Date() }).eq('id', id).eq('workspaceId', workspaceId).eq('clientId', clientId);
            if (error) throw error;
            return this.getCustomers();
        } catch (err) {
            return this.handleError(err);
        }
    }

    async updateCustomer({ id, workspaceId, clientId }, updateValues) {
        try {
            const selectFields = `
                id, firstname, lastname, email, phone, type, title, department, timezone,
                linkedin, twitter, language, source, assignedTo, accountValue, tagIds, notes,
                lastContacted, created_at, updated_at, street, city, state, postalCode, country,
                company: companies(name)  -- Fetch company name
            `;
            // Update the customer record
            const { data, error } = await this.supabase
                .from(this.entityName)
                .update(updateValues)
                .match({ id, workspaceId, clientId })  // ✅ More efficient filtering
                .select(selectFields) // Return updated customer
                .single();

            if (error) throw error;

            // Publish event asynchronously (does not block response)
            let inst = new CustomerEventPublisher();
            inst.updated(id, updateValues).catch(err => console.error("Event error:", err));  // ✅ Runs in the background
            return {
                id: data.id,
                firstName: data.firstname,
                lastName: data.lastname,
                email: data.email,
                phone: data.phone || null,
                company: data.company ? data.company.name : null, // Extract company name
                status: data.status || "active",
                type: data.type,
                title: data.title,
                department: data.department,
                timezone: data.timezone,
                linkedinUrl: data.linkedin,
                twitterUrl: data.twitter,
                language: data.language || "English",
                source: data.source || "website",
                assignedTo: data.assignedTo || null,
                accountValue: data.accountValue || 0,
                tags: data.tagIds ? data.tagIds : [],
                notes: data.notes || "",
                lastContacted: data.lastContacted ? new Date(data.lastContacted).toISOString() : null,
                createdAt: new Date(data.created_at).toISOString(),
                updatedAt: new Date(data.updated_at).toISOString(),
                street: data.street || "",
                city: data.city || "",
                state: data.state || "",
                postalCode: data.postalCode || "",
                country: data.country || "",
            };
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getCustomerDetails(customer_id, workspaceId, clientId) {
        try {
            // Ensure we select necessary fields, including company name
            const selectFields = `
                id, firstname, lastname, email, phone, type, title, department, timezone,
                linkedin, twitter, language, source, assignedTo, accountValue, tagIds, notes,
                lastContacted, created_at, updated_at, street, city, state, postalCode, country,
                company: companies(name)  -- Fetch company name
            `;

            // Query Supabase for a single customer
            const { data, error } = await this.supabase
                .from(this.entityName)
                .select(selectFields)
                .eq("id", customer_id)
                .eq("workspaceId", workspaceId)
                .eq("clientId", clientId)
                .single();

            // Handle errors or missing data
            if (error) throw error;
            if (!data) throw new errors.NotFound("Customer not found.");

            // Format the response
            return {
                id: data.id,
                firstname: data.firstname,
                lastname: data.lastname,
                email: data.email,
                phone: data.phone || null,
                company: data.company ? data.company.name : null, // Extract company name
                status: data.status || "active",
                type: data.type,
                title: data.title,
                department: data.department,
                timezone: data.timezone,
                linkedinUrl: data.linkedin,
                twitterUrl: data.twitter,
                language: data.language || "English",
                source: data.source || "website",
                assignedTo: data.assignedTo || null,
                accountValue: data.accountValue || 0,
                tags: data.tagIds ? data.tagIds : [],
                notes: data.notes || "",
                lastContacted: data.lastContacted ? new Date(data.lastContacted).toISOString() : null,
                createdAt: new Date(data.created_at).toISOString(),
                updatedAt: new Date(data.updated_at).toISOString(),
                street: data.street || "",
                city: data.city || "",
                state: data.state || "",
                postalCode: data.postalCode || "",
                country: data.country || "",
            };
        } catch (err) {
            return this.handleError(err);
        }
    }


    async getCustomers(workspaceId, clientId) {
        const { data, error } = await this.supabase
            .from(this.entityName)
            .select(this.listingFields.join(","))
            .eq("workspaceId", workspaceId)
            .eq("clientId", clientId)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return data.map(customer => ({
            id: customer.id,
            firstname: customer.firstname,
            lastname: customer.lastname,
            email: customer.email,
            phone: customer.phone || null,
            company: customer.companies ? customer.companies.name : null, // Ensure this is replaced with the actual company name if needed
            status: customer.status || 'active',
            type: customer.type,
            title: customer.title,
            department: customer.department,
            timezone: customer.timezone,
            linkedinUrl: customer.linkedin,
            twitterUrl: customer.twitter,
            language: customer.language || 'English',
            source: customer.source || 'unknown',
            assignedTo: customer.assignedTo || null,
            accountValue: customer.accountValue || 0,
            tags: customer.tagIds ? customer.tagIds : [], // Ensure proper tag retrieval
            notes: customer.notes || '',
            lastContacted: customer.lastContacted ? new Date(customer.lastContacted).toISOString() : null,
            createdAt: new Date(customer.created_at).toISOString(),
            updatedAt: new Date(customer.updated_at).toISOString(),
            street: customer.street || '',
            city: customer.city || '',
            state: customer.state || '',
            postalCode: customer.postalCode || '',
            country: customer.country || ''
        }));
    }


    async parseFilters({ name, email, type, companyId, archived, workspaceId, clientId, lastActiveFrom, lastActiveTo }) {
        let filters = {};
        if (workspaceId) filters.workspaceId = workspaceId;
        if (clientId) filters.clientId = clientId;
        if (name) filters.firstname = { ilike: `%${name}%` };
        if (email) filters.email = email;
        if (type) filters.type = type;
        if (companyId) filters.companyId = companyId;
        if (archived) filters.archiveAt = { not: null };
        if (lastActiveFrom) filters.lastActiveAt = { gte: lastActiveFrom };
        if (lastActiveTo) filters.lastActiveAt = { lte: lastActiveTo };
        return filters;
    }

}

module.exports = CustomerService;
