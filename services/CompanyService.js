const Promise = require("bluebird");
const errors = require("../errors");
const CompanyUtility = require('../db/utilities/CompanyUtility');
const BaseService = require("./BaseService");
const _ = require("lodash");
const { CompanyEventPublisher } = require("../Events/CompanyEvent");
const { createClient } = require('@supabase/supabase-js');
const TagHistoryService = require("./TagHistoryService");


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
            let company = await this.getDetails(id, workspaceId, clientId);

            // Ensure location updates are correctly formatted
            if (updateValues.street || updateValues.city || updateValues.state || updateValues.zipcode || updateValues.country) {
                updateValues.location = {
                    street: updateValues.street || company.location?.street || '',
                    city: updateValues.city || company.location?.city || '',
                    state: updateValues.state || company.location?.state || '',
                    country: updateValues.country || company.location?.country || '',
                    zipcode: updateValues.zipcode || company.location?.zipcode || ''
                };
                delete updateValues.street;
                delete updateValues.city;
                delete updateValues.state;
                delete updateValues.zipcode;
                delete updateValues.country;
            }

            await this.update({ id: company.id }, updateValues);

            // update tag history only if tags are updated
            if (updateValues.tags) {
                await this.supabase.from('companyTags').delete().eq('companyId', id);
                const tagEntries = updateValues.tags.map(tag => ({ companyId: id, tagId: tag.id, workspaceId: workspaceId, clientId: clientId }));
                await this.supabase.from('companyTags').insert(tagEntries);

                // Only iterate through tags if they exist
                updateValues.tags.forEach(async (tag) => {
                    await tagHistoryService.updateTagHistory(tag.id, "company");
                });
            }
            // No use of this event publisher for now (No RabbitMQ)
            // let inst = new CompanyEventPublisher();
            // await inst.updated(company, updateValues);

            // Fetch and return updated company details
            let updatedCompany = await this.getDetails(id, workspaceId, clientId);
            return updatedCompany;
        } catch (e) {
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
}

module.exports = CompanyService;
