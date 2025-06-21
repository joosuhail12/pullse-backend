const Promise = require("bluebird");
const errors = require("../errors");
const CompanyUtility = require('../db/utilities/CompanyUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");
const { CompanyEventPublisher } = require("../Events/CompanyEvent");
const { createClient } = require('@supabase/supabase-js');
const TagHistoryService = require("./TagHistoryService");
const TimelineService = require('./TimelineService');


class CompanyService extends BaseService {
    constructor() {
        super();
        this.utilityInst = new CompanyUtility();
        this.entityName = 'companies';
        this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        this.listingFields = [
            "id", "name", "phone", "numberOfEmployees", "annualRevenue",
            "website", "tierLevel", "industry", "location", "type", "status",
            "email", "foundedYear", "mainContact", "marketSegment",
            "businessModel", "preferredLanguage", "timezone", "socialMedia"
        ];
        this.updatableFields = [
            "name", "description", "phone", "numberOfEmployees", "annualRevenue",
            "website", "notes", "tagIds", "tierLevel", "industry", "location",
            "type", "status", "email", "foundedYear", "mainContact",
            "marketSegment", "businessModel", "preferredLanguage", "timezone", "socialMedia"
        ];
    }

    async createCompany(companyData = {}) {
        try {
            let { name, clientId = null, workspaceId = null } = companyData;

            // Ensure required fields exist
            if (!name || !workspaceId) {
                throw new Error("Missing required fields: 'name' and 'workspaceId' are required.");
            }

            // Format location as JSONB if address fields are provided
            if (companyData.street || companyData.city || companyData.state || companyData.zipcode || companyData.country) {
                companyData.location = {
                    street: companyData.street || '',
                    city: companyData.city || '',
                    state: companyData.state || '',
                    country: companyData.country || '',
                    zipcode: companyData.zipcode || ''
                };
                delete companyData.street;
                delete companyData.city;
                delete companyData.state;
                delete companyData.zipcode;
                delete companyData.country;
            }
            // Attempt to insert company data
            let { data: createdCompany, error } = await this.supabase
                .from('companies')
                .insert([companyData])
                .select()
                .single(); // Ensures exactly one row is returned

            // Handle insertion error (e.g., duplicate entry)
            if (error) {
                if (error.code === '23505') { // PostgreSQL unique constraint violation
                    let { data: existingCompany } = await this.supabase
                        .from('companies')
                        .select('*')
                        .eq('name', name)
                        .eq('workspaceId', workspaceId)
                        .single();

                    // Fetch and return the list of companies for this workspace
                    let { data: companyList } = await this.supabase
                        .from('companies')
                        .select('*')
                        .eq('workspaceId', workspaceId);

                    return {
                        message: "Company already exists",
                        company: existingCompany,
                        companyList
                    };
                }
                throw error;
            }
            let inst = new CompanyEventPublisher();
            await inst.created(createdCompany);

            // Fetch and return the list of all companies for this workspace
            let { data: companyList } = await this.supabase
                .from('companies')
                .select('*')
                .eq('workspaceId', workspaceId);

            return {
                message: "Company created successfully",
                company: createdCompany,
                companyList
            };
        } catch (err) {
            return this.handleError(err);
        }
    }



    async getDetails(id, workspaceId, clientId) {
        try {
            let company = await this.findOne({ id, workspaceId, clientId });

            if (_.isEmpty(company)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }

            // Fetch tags related to the company from companyTags table
            const { data: companyTags, error: tagError } = await this.supabase
                .from("companyTags")
                .select("tag: tags(id, name)") // Fetch associated tag details
                .eq("companyId", id);

            if (tagError) throw tagError;

            // Attach tags to the company object
            company.tags = companyTags ? companyTags.map(entry => entry.tag) : [];

            return company;
        } catch (err) {
            return this.handleError(err);
        }
    }


    async updateCompany({ id, workspaceId, clientId }, updateValues) {
        try {
            const tagHistoryService = new TagHistoryService();

            // console.log("🔍 INCOMING UPDATE VALUES:", JSON.stringify(updateValues));

            // 1. Check if the company exists
            let company = await this.getDetails(id, workspaceId, clientId);
            // console.log("📂 EXISTING COMPANY DATA:", {
            //     id: company.id,
            //     location: company.location,
            //     socialMedia: company.socialMedia
            // });

            // Create shallow copy of updateValues to avoid modifying the original object
            const updates = { ...updateValues };
            // console.log("📋 UPDATES AFTER COPY:", JSON.stringify(updates));

            // Process location updates with dot notation
            const locationDotProps = Object.keys(updates).filter(key => key.startsWith('location.'));
            // console.log("🏠 LOCATION DOT PROPERTIES:", locationDotProps);

            if (locationDotProps.length > 0) {
                // Get current location or initialize empty object
                const currentLocation = company.location || {};
                // console.log("🏠 CURRENT LOCATION:", currentLocation);

                // Create updated location object
                const newLocation = { ...currentLocation };

                // Apply updates for each location property
                locationDotProps.forEach(prop => {
                    const fieldName = prop.split('.')[1]; // Extract field name (after 'location.')
                    // console.log(`🏠 UPDATING LOCATION FIELD: ${fieldName} = ${updates[prop]}`);
                    newLocation[fieldName] = updates[prop];
                    delete updates[prop]; // Remove dot notation property
                });

                // console.log("🏠 NEW LOCATION OBJECT:", newLocation);

                // Set the complete location object in updates
                updates.location = newLocation;
            }

            // Process socialMedia updates with dot notation
            const socialMediaDotProps = Object.keys(updates).filter(key => key.startsWith('socialMedia.'));
            // console.log("🔗 SOCIAL MEDIA DOT PROPERTIES:", socialMediaDotProps);

            if (socialMediaDotProps.length > 0) {
                // Get current socialMedia or initialize empty object
                const currentSocialMedia = company.socialMedia || {};
                // console.log("🔗 CURRENT SOCIAL MEDIA:", currentSocialMedia);

                // Create updated socialMedia object
                const newSocialMedia = { ...currentSocialMedia };

                // Apply updates for each socialMedia property
                socialMediaDotProps.forEach(prop => {
                    const fieldName = prop.split('.')[1]; // Extract field name (after 'socialMedia.')
                    // console.log(`🔗 UPDATING SOCIAL MEDIA FIELD: ${fieldName} = ${updates[prop]}`);
                    newSocialMedia[fieldName] = updates[prop];
                    delete updates[prop]; // Remove dot notation property
                });

                // console.log("🔗 NEW SOCIAL MEDIA OBJECT:", newSocialMedia);

                // Set the complete socialMedia object in updates
                updates.socialMedia = newSocialMedia;
            }

            // Handle traditional location field updates if present
            if (updates.street || updates.city || updates.state || updates.zipcode || updates.country) {
                // console.log("🏠 USING TRADITIONAL LOCATION FIELDS");
                const currentLocation = updates.location || company.location || {};
                updates.location = {
                    ...currentLocation,
                    street: updates.street || currentLocation.street || '',
                    city: updates.city || currentLocation.city || '',
                    state: updates.state || currentLocation.state || '',
                    country: updates.country || currentLocation.country || '',
                    zipcode: updates.zipcode || currentLocation.zipcode || ''
                };
                delete updates.street;
                delete updates.city;
                delete updates.state;
                delete updates.zipcode;
                delete updates.country;
            }

            // Handle traditional socialMedia field updates if present
            if (updates.linkedin || updates.twitter || updates.facebook) {
                // console.log("🔗 USING TRADITIONAL SOCIAL MEDIA FIELDS");
                const currentSocialMedia = updates.socialMedia || company.socialMedia || {};
                updates.socialMedia = {
                    ...currentSocialMedia,
                    linkedin: updates.linkedin || currentSocialMedia.linkedin || '',
                    twitter: updates.twitter || currentSocialMedia.twitter || '',
                    facebook: updates.facebook || currentSocialMedia.facebook || ''
                };
                delete updates.linkedin;
                delete updates.twitter;
                delete updates.facebook;
            }

            // console.log("✅ FINAL UPDATES OBJECT:", JSON.stringify(updates));

            // Handle tags updates separately
            if (updates.tags) {
                // console.log("🏷️ UPDATING TAGS");

                // Get current tags before deletion for timeline tracking
                const { data: currentTagsData, error: currentTagsError } = await this.supabase
                    .from('companyTags')
                    .select('tagId, tags(name)')
                    .eq('companyId', id)
                    .eq('workspaceId', workspaceId)
                    .eq('clientId', clientId);

                const currentTagIds = currentTagsData ? currentTagsData.map(ct => ct.tagId) : [];
                const currentTagNames = currentTagsData ? currentTagsData.map(ct => ct.tags.name) : [];
                const newTagIds = updates.tags.map(tag => tag.id);
                const newTagNames = updates.tags.map(tag => tag.name);

                // Extract tags and remove from main updates object
                const tags = [...updates.tags];
                delete updates.tags;

                // Delete existing tags
                await this.supabase.from('companyTags').delete().eq('companyId', id);

                // Insert new tags
                const tagEntries = tags.map(tag => ({
                    companyId: id,
                    tagId: tag.id,
                    workspaceId,
                    clientId
                }));

                await this.supabase.from('companyTags').insert(tagEntries);

                // Update tag history
                tags.forEach(async (tag) => {
                    await tagHistoryService.updateTagHistory(tag.id, "company");
                });

                // Log tag changes to timeline
                const timelineService = new TimelineService();
                await timelineService.logTagActivity('company', id, {
                    old_tag_ids: currentTagIds,
                    new_tag_ids: newTagIds,
                    added_tag_names: newTagNames.filter(name => !currentTagNames.includes(name)),
                    removed_tag_names: currentTagNames.filter(name => !newTagNames.includes(name)),
                    actor_id: updates.updatedBy || null,
                    actor_name: await timelineService.getUserName(updates.updatedBy) || null,
                    actor_type: 'user',
                    source: 'web'
                }, workspaceId, clientId);

                // Only update company data if there are other fields to update
                if (Object.keys(updates).length > 0) {
                    // console.log("🏢 UPDATING COMPANY WITH:", JSON.stringify(updates));
                    await this.update({ id: company.id }, updates);
                } else {
                    // console.log("⚠️ NO COMPANY FIELDS TO UPDATE, ONLY TAGS WERE UPDATED");
                }

                // Fetch and return updated company details with tags
                let updatedCompany = await this.getDetails(id, workspaceId, clientId);
                // console.log("📄 RETURNED COMPANY DATA:", {
                //     id: updatedCompany.id,
                //     location: updatedCompany.location,
                //     socialMedia: updatedCompany.socialMedia,
                //     tags: updatedCompany.tags
                // });

                return updatedCompany;
            } else {
                // If no tags to update, proceed with normal company update
                if (Object.keys(updates).length > 0) {
                    // console.log("🏢 UPDATING COMPANY WITH:", JSON.stringify(updates));
                    await this.update({ id: company.id }, updates);
                } else {
                    // console.log("⚠️ NO UPDATES TO APPLY");
                }

                // Fetch and return updated company details
                let updatedCompany = await this.getDetails(id, workspaceId, clientId);
                // console.log("📄 RETURNED COMPANY DATA:", {
                //     id: updatedCompany.id,
                //     location: updatedCompany.location,
                //     socialMedia: updatedCompany.socialMedia
                // });

                return updatedCompany;
            }
        } catch (e) {
            console.error("❌ ERROR IN updateCompany:", e);
            return this.handleError(e);
        }
    }


    async deleteCompany({ id, workspaceId, clientId }) {
        try {
            let company = await this.getDetails(id, workspaceId, clientId);
            let res = await this.softDelete(company.id);
            return res;
        } catch (err) {
            return this.handleError(err);
        }
    }

    parseFilters({ name, createdFrom, createdTo, workspaceId, clientId, tagId, industry, city, state, country, type, status }) {
        let filters = {};
        filters.workspaceId = workspaceId;
        filters.clientId = clientId;

        if (name) {
            filters.name = name;
        }

        if (tagId) {
            filters.tagIds = tagId;
        }

        if (industry) {
            filters.industry = industry;
        }

        if (type) {
            filters.type = type;
        }

        if (status) {
            filters.status = status;
        }

        // Handle filtering by location fields
        if (city || state || country) {
            filters.location = {};
            if (city) filters.location.city = city;
            if (state) filters.location.state = state;
            if (country) filters.location.country = country;
        }

        if (createdFrom) {
            if (!filters.createdAt) {
                filters.createdAt = {};
            }
            filters.createdAt['gte'] = createdFrom;
        }
        if (createdTo) {
            if (!filters.createdAt) {
                filters.createdAt = {};
            }
            filters.createdAt['lt'] = createdTo;
        }

        return filters;
    }

    async getCompanyRelatedData({ id, workspaceId, clientId }) {
        try {
            // Get company details first
            const company = await this.getDetails(id, workspaceId, clientId);

            if (_.isEmpty(company)) {
                return Promise.reject(new errors.NotFound(`${this.entityName} not found.`));
            }

            // Get customers associated with this company
            const { data: customers, error: customersError } = await this.supabase
                .from('customers')
                .select('id, firstname, lastname, email, phone, status, type, title, department, timezone, linkedin, twitter, language, source, assignedTo, accountValue, notes, lastContacted, created_at, updated_at, street, city, state, postalCode, country')
                .eq('companyId', id)
                .eq('workspaceId', workspaceId)
                .eq('clientId', clientId)
                .is('deletedAt', null);

            if (customersError) throw customersError;

            // Get customer IDs for ticket lookup
            const customerIds = (customers || []).map(customer => customer.id);

            // 3. Get tickets for these customers
            let tickets = [];
            let assignedToUsersMap = {}; // Add this map to store user details

            if (customerIds.length > 0) {
                const { data: ticketsData, error: ticketsError } = await this.supabase
                    .from('tickets')
                    .select(`
                        id, sno, title, description, status, priority, customerId, 
                        teamId, teams:teamId(id, name),
                        assignedTo, assigneeId, lastMessage, lastMessageAt, lastMessageBy,
                        createdAt, updatedAt, closedAt, unread, language, typeId, channel, device
                    `)
                    .in('customerId', customerIds)
                    .eq('workspaceId', workspaceId)
                    .eq('clientId', clientId)
                    .is('deletedAt', null)
                    .order('updatedAt', { ascending: false });

                if (ticketsError) {
                    console.error("Tickets fetch error:", ticketsError);
                    throw ticketsError;
                }

                tickets = ticketsData || [];

                // Get all assignedTo IDs for a single lookup
                const assignedToIds = tickets
                    .filter(ticket => ticket.assignedTo)
                    .map(ticket => ticket.assignedTo);

                // Fetch user details if there are assignedTo values
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
            }

            // 4. Format customers
            const formattedCustomers = (customers || []).map(customer => ({
                id: customer.id,
                firstname: customer.firstname || '',
                lastname: customer.lastname || '',
                email: customer.email,
                phone: customer.phone || null,
                company: company.name,
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
                notes: customer.notes || '',
                lastContacted: customer.lastContacted ? new Date(customer.lastContacted).toISOString() : null,
                createdAt: customer.created_at ? new Date(customer.created_at).toISOString() : null,
                updatedAt: customer.updated_at ? new Date(customer.updated_at).toISOString() : null,
                street: customer.street || '',
                city: customer.city || '',
                state: customer.state || '',
                postalCode: customer.postalCode || '',
                country: customer.country || ''
            }));

            // 5. Format tickets with enhanced data
            const formattedTickets = tickets.map(ticket => {
                // Find the customer for this ticket
                const ticketCustomer = customers.find(c => c.id === ticket.customerId);
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
                    customer: ticketCustomer ? {
                        id: ticketCustomer.id,
                        name: `${ticketCustomer.firstname || ''} ${ticketCustomer.lastname || ''}`.trim() || ticketCustomer.email || 'Unknown',
                        email: ticketCustomer.email,
                        phone: ticketCustomer.phone
                    } : null,

                    companyId: id,
                    company: {
                        id: company.id,
                        name: company.name,
                        domain: company.website
                    },

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

            // 6. Return combined data
            return {
                company,
                customers: formattedCustomers,
                tickets: formattedTickets
            };
        } catch (err) {
            console.error("Error in getCompanyRelatedData:", err);
            return this.handleError(err);
        }
    }
}

module.exports = CompanyService;
