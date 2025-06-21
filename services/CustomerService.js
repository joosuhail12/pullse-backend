const { createClient } = require('@supabase/supabase-js');
const errors = require("../errors");
const BaseService = require("./BaseService");
const CompanyService = require("./CompanyService");
const TagService = require("./TagService");
const CSVHandler = require('../FileManagement/CSVFileSystem');
const { CustomerEventPublisher } = require("../Events/CustomerEvent");
const TagHistoryService = require("./TagHistoryService");
const TimelineService = require('./TimelineService');

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
                let { data: newCustomer, error: insertError } = await this.supabase.from(this.entityName).insert(customerData).select().single();
                if (insertError) throw insertError;
                customer = newCustomer;
                let inst = new CustomerEventPublisher();
                await inst.created(customer);
            }
            return customer;
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
        // console.log("🔍 INCOMING UPDATE VALUES:", JSON.stringify(updateValues));
        try {
            // Map API field names to database column names
            if (updateValues.linkedinUrl !== undefined) {
                updateValues.linkedin = updateValues.linkedinUrl;
                delete updateValues.linkedinUrl;
            }
            if (updateValues.twitterUrl !== undefined) {
                updateValues.twitter = updateValues.twitterUrl;
                delete updateValues.twitterUrl;
            }

            const tagHistoryService = new TagHistoryService();

            // 1. Check if the customer exists with company info
            const { data: existingCustomer, error: fetchError } = await this.supabase
                .from(this.entityName)
                .select("id, companyId")
                .match({ id, workspaceId, clientId })
                .single();

            if (fetchError || !existingCustomer) {
                throw new Error("Customer not found or does not exist.");
            }

            // 2. If company name is being updated, handle that separately
            if (updateValues.company && existingCustomer.companyId) {
                // console.log(`Updating company name to: ${updateValues.company}`);

                // Update the company name in the companies table
                const { error: companyUpdateError } = await this.supabase
                    .from('companies')
                    .update({ name: updateValues.company })
                    .match({
                        id: existingCustomer.companyId,
                        workspaceId,
                        clientId
                    });

                if (companyUpdateError) {
                    console.error("Error updating company:", companyUpdateError);
                    throw companyUpdateError;
                }

                // Remove company from customer updates
                delete updateValues.company;
            }

            // 3. Update customer tags if provided
            if (updateValues.tags) {
                // Get current tags before deletion for timeline tracking
                const { data: currentTagsData, error: currentTagsError } = await this.supabase
                    .from('customerTags')
                    .select('tagId, tags(name)')
                    .eq('customerId', id)
                    .eq('workspaceId', workspaceId)
                    .eq('clientId', clientId);

                const currentTagIds = currentTagsData ? currentTagsData.map(ct => ct.tagId) : [];
                const currentTagNames = currentTagsData ? currentTagsData.map(ct => ct.tags.name) : [];
                const newTagIds = updateValues.tags.map(tag => tag.id);
                const newTagNames = updateValues.tags.map(tag => tag.name);

                // Delete existing tags
                await this.supabase.from('customerTags').delete().eq('customerId', id);

                // Insert new tags
                const tagEntries = updateValues.tags.map(tag => ({
                    customerId: id,
                    tagId: tag.id,
                    workspaceId: workspaceId,
                    clientId: clientId
                }));
                await this.supabase.from('customerTags').insert(tagEntries);
                updateValues.tags.forEach(async (tag) => {
                    await tagHistoryService.updateTagHistory(tag.id, "customer");
                });

                // Log tag changes to timeline
                const timelineService = new TimelineService();

                // Only log tag changes if there are actual tag changes
                const hasTagChanges =
                    newTagIds.length !== currentTagIds.length ||
                    !newTagIds.every(id => currentTagIds.includes(id)) ||
                    !currentTagIds.every(id => newTagIds.includes(id));

                if (hasTagChanges) {
                    // Properly await the getUserName call
                    const actorName = updateValues.updatedBy ? await timelineService.getUserName(updateValues.updatedBy) : null;

                    await timelineService.logTagActivity('contact', id, {
                        old_tag_ids: currentTagIds,
                        new_tag_ids: newTagIds,
                        added_tag_names: newTagNames.filter(name => !currentTagNames.includes(name)),
                        removed_tag_names: currentTagNames.filter(name => !newTagNames.includes(name)),
                        actor_id: updateValues.updatedBy || null,
                        actor_name: actorName,
                        actor_type: 'user',
                        source: 'web'
                    }, workspaceId, clientId);
                }

                // Store a copy of tags before deleting
                const tags = [...updateValues.tags];
                delete updateValues.tags; // Remove tags from the update object

                // 4. Check if there are any actual updates to the customer data
                // console.log("Final update values being sent to database:", updateValues);

                // Only attempt customer update if there are other fields to update
                if (Object.keys(updateValues).length > 0) {
                    const { data, error } = await this.supabase
                        .from(this.entityName)
                        .update(updateValues)
                        .match({ id, workspaceId, clientId })
                        .select("*")
                        .maybeSingle();

                    if (error) throw error;
                }

                // 5. Fetch updated customer details including tags with names
                const { data: updatedCustomer, error: fetchUpdatedError } = await this.supabase
                    .from(this.entityName)
                    .select("*, customerTags(tag: tags(id, name)), companies(name)")
                    .eq("id", id)
                    .eq("workspaceId", workspaceId)
                    .eq("clientId", clientId)
                    .single();

                if (fetchUpdatedError) throw fetchUpdatedError;

                return {
                    ...updatedCustomer,
                    tags: updatedCustomer.customerTags ? updatedCustomer.customerTags.map(tag => ({
                        id: tag.tag.id,
                        name: tag.tag.name
                    })) : []
                };
            } else {
                // If no tags to update, proceed with normal customer update
                const { data, error } = await this.supabase
                    .from(this.entityName)
                    .update(updateValues)
                    .match({ id, workspaceId, clientId })
                    .select("*")
                    .maybeSingle();

                if (error) throw error;
                if (!data) throw new Error("No updates were made. Ensure the data is different from existing values.");

                return data;
            }
        } catch (err) {
            return this.handleError(err);
        }
    }

    async getCustomerDetails(customer_id, workspaceId, clientId) {
        try {
            // Query Supabase for a single customer including company and tags
            const { data, error } = await this.supabase
                .from(this.entityName)
                .select(`
                        id, firstname, lastname, email, phone, type, title, department, timezone,
                        linkedin, twitter, language, source, assignedTo, accountValue, notes,
                        lastContacted, created_at, updated_at, street, city, state, postalCode, country,
                        company: companies(name), companyId,
                        customerTags(tag: tags(id, name))
                    `)
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
                companyId: data.companyId,
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
                tags: data.customerTags ? data.customerTags.map(tag => ({ id: tag.tag.id, name: tag.tag.name })) : [], // Extract tag objects
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

    async getCustomerRelatedData({ id, workspaceId, clientId }) {
        try {
            // 1. Get customer details
            const { data: customer, error: customerError } = await this.supabase
                .from(this.entityName)
                .select(`
                    *, 
                    company: companies(id, name, website),
                    customerTags(tag: tags(id, name))
                `)
                .eq('id', id)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null)
                .single();

            if (customerError) {
                console.error("Customer fetch error:", customerError);
                throw new errors.NotFound(`Customer not found.`);
            }

            if (!customer) {
                throw new errors.NotFound(`Customer not found.`);
            }

            // 2. Get tickets associated with this customer
            const { data: tickets, error: ticketsError } = await this.supabase
                .from('tickets')
                .select(`
                    id, sno, title, description, status, priority, customerId, 
                    teamId, teams:teamId(id, name),
                    assignedTo, assigneeId, lastMessage, lastMessageAt, lastMessageBy,
                    createdAt, updatedAt, closedAt, unread, language, typeId, channel, device
                `)
                .eq('customerId', id)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null)
                .order('updatedAt', { ascending: false });

            if (ticketsError) {
                console.error("Tickets fetch error:", ticketsError);
                throw ticketsError;
            }

            // Get all assignedTo IDs for tickets
            const assignedToIds = (tickets || [])
                .filter(ticket => ticket.assignedTo)
                .map(ticket => ticket.assignedTo);

            // Fetch user details if there are assignedTo values
            let assignedToUsersMap = {};
            if (assignedToIds.length > 0) {
                const { data: users, error: usersError } = await this.supabase
                    .from('users')
                    .select('id, name, email')
                    .in('id', assignedToIds);

                if (!usersError && users) {
                    // Create a lookup map for easy access
                    assignedToUsersMap = users.reduce((map, user) => {
                        map[user.id] = user;
                        return map;
                    }, {});
                }
            }

            // 3. Format customer
            const formattedCustomer = {
                id: customer.id,
                firstname: customer.firstname || '',
                lastname: customer.lastname || '',
                email: customer.email,
                phone: customer.phone || null,
                companyId: customer.companyId,
                company: customer.company ? customer.company.name : null,
                status: customer.status || 'active',
                type: customer.type || 'customer',
                title: customer.title || null,
                department: customer.department || null,
                timezone: customer.timezone || null,
                linkedinUrl: customer.linkedin || null,
                twitterUrl: customer.twitter || null,
                language: customer.language || 'English',
                source: customer.source || 'website',
                assignedTo: customer.assignedTo || null,
                accountValue: customer.accountValue || 0,
                tags: customer.customerTags ? customer.customerTags.map(tag => ({ id: tag.tag.id, name: tag.tag.name })) : [],
                notes: customer.notes || '',
                lastContacted: customer.lastContacted ? new Date(customer.lastContacted).toISOString() : null,
                createdAt: customer.created_at ? new Date(customer.created_at).toISOString() : null,
                updatedAt: customer.updated_at ? new Date(customer.updated_at).toISOString() : null,
                street: customer.street || '',
                city: customer.city || '',
                state: customer.state || '',
                postalCode: customer.postalCode || '',
                country: customer.country || ''
            };

            // 4. Format tickets
            const formattedTickets = (tickets || []).map(ticket => {
                const assignedToUser = ticket.assignedTo ? assignedToUsersMap[ticket.assignedTo] : null;

                return {
                    id: ticket.id,
                    sno: ticket.sno,
                    subject: ticket.title,
                    description: ticket.description,

                    status: ticket.status,
                    statusType: ticket.statusId,
                    priority: ticket.priority === 2 ? 'high' : ticket.priority === 1 ? 'medium' : 'low',
                    priorityRaw: ticket.priority,

                    customerId: ticket.customerId,
                    customer: {
                        id: customer.id,
                        name: `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || customer.email || 'Unknown',
                        email: customer.email,
                        phone: customer.phone
                    },

                    company: customer.company ? {
                        id: customer.company.id,
                        name: customer.company.name,
                        domain: customer.company.website
                    } : null,

                    assigneeId: ticket.assigneeId,
                    assignedTo: ticket.assignedTo,
                    assignedToUser: assignedToUser ? {
                        id: assignedToUser.id,
                        name: assignedToUser.name,
                        email: assignedToUser.email
                    } : null,

                    teamId: ticket.teamId,
                    team: ticket.teams ? {
                        id: ticket.teams.id,
                        name: ticket.teams.name
                    } : null,

                    lastMessage: ticket.lastMessage,
                    lastMessageAt: ticket.lastMessageAt,
                    lastMessageBy: ticket.lastMessageBy,

                    channel: ticket.channel,
                    device: ticket.device,

                    language: ticket.language || 'en',
                    type: ticket.type || 'general',

                    createdAt: ticket.createdAt,
                    updatedAt: ticket.updatedAt,
                    closedAt: ticket.closedAt,

                    isUnread: Boolean(ticket.unread)
                };
            });

            // 5. Return combined data
            return {
                customer: formattedCustomer,
                tickets: formattedTickets
            };
        } catch (err) {
            console.error("Error in getCustomerRelatedData:", err);
            return this.handleError(err);
        }
    }

}

module.exports = CustomerService;
