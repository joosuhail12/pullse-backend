const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const AuthService = require("./AuthService");
const ConversationEventPublisher = require("../Events/ConversationEvent/ConversationEventPublisher");
const { initializeWidgetSession, subscribeToConversationChannels, subscribeToChatbotPrimary } = require("../ablyServices/listeners");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs').promises;

class WidgetService extends BaseService {
    constructor() {
        super();
        this.entityName = "widget";
        this.authService = new AuthService();

        this.s3Client = new S3Client({
            region: 'auto',
            endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
            credentials: {
                accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
                secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
            },
        });
    }

    async getWidgets({ workspaceId, clientId }) {
        try {
            const { data, error } = await this.supabase.from(this.entityName).select(`
                *,
                widgettheme!widgettheme_widgetId_fkey(id, name, colors, labels,widgetId, layout, brandAssets, widgetSettings, interfaceSettings),
                widgetfield!widgetfield_widgetId_fkey1(*),
                widgetapikeyrelation!widgetapikeyrelation_widgetId_fkey(apiKey)
            `).eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null).single();
            if (error) {
                throw new errors.InternalServerError(error.message);
            }


            const contactFields = data.widgetfield.filter(field => field.fieldSourceType === "contact");

            const contactFieldsArray = contactFields.length > 0 ? contactFields.map(field => ({
                entityname: "contact",
                columnname: field.standardFieldName, // Use id incase of custom data
                label: field.label,
                type: field.fieldType,
                placeholder: field.placeholder,
                required: field.isRequired,
                position: field.position
            })) : [];

            const companyFields = data.widgetfield.filter(field => field.fieldSourceType === "company");

            const companyFieldsArray = companyFields.length > 0 ? companyFields.map(field => ({
                entityname: "company",
                columnname: field.standardFieldName, // Use id incase of custom data
                label: field.label,
                type: field.fieldType,
                placeholder: field.placeholder,
                required: field.isRequired,
                position: field.position
            })) : [];


            const ticketFields = data.widgetfield.filter(field => field.fieldSourceType === "ticket");

            const ticketFieldsArray = ticketFields.length > 0 ? ticketFields.map(field => ({
                entityname: "ticket",
                columnname: field.standardFieldName, // Use id incase of custom data
                label: field.label,
                type: field.fieldType,
                placeholder: field.placeholder,
                required: field.isRequired,
                position: field.position
            })) : [];

            const customFields = data.widgetfield.filter(field => field.fieldSourceType === "custom_field");

            const customFieldsData = await this.supabase.from("customfields").select("*").in("id", customFields.map(field => field.customFieldId)).is("deletedAt", null);

            const customFieldsArray = customFields.length > 0 ? customFields.map(widgetField => {
                // Find matching custom field data
                const customFieldData = customFieldsData.data.find(cf => cf.id === widgetField.customFieldId);


                return {
                    entityname: "customfield",
                    columnname: widgetField.customFieldId,
                    label: customFieldData.name,
                    type: customFieldData.fieldType,
                    placeholder: customFieldData.placeholder,
                    required: widgetField.isRequired,
                    options: customFieldData.options,
                    position: widgetField.position,
                    entityType: customFieldData.entityType
                };
            }) : [];


            const customObjectFields = data.widgetfield.filter(field => field.fieldSourceType === "custom_object_field");

            const customObjectFieldsData = await this.supabase.from("customobjectfields").select("*").in("id", customObjectFields.map(field => field.customObjectFieldId)).is("deletedAt", null);

            const customObjectFieldsArray = customObjectFields.length > 0 ? customObjectFields.map(widgetField => {
                // Find matching custom field data
                const customFieldData = customObjectFieldsData.data.find(cf => cf.id === widgetField.customObjectFieldId);

                return {
                    entityname: "customobjectfield",
                    columnname: widgetField.customObjectFieldId,
                    label: customFieldData.name,
                    type: customFieldData.fieldType,
                    placeholder: customFieldData.placeholder,
                    required: widgetField.isRequired,
                    options: customFieldData.options,
                    position: widgetField.position,
                    entityType: customFieldData.entityType
                };
            }) : [];

            data.widgetfield = {
                contactFields: [...contactFieldsArray, ...customFieldsArray.filter(field => field.entityType === "customer")],
                companyFields: [...companyFieldsArray, ...customFieldsArray.filter(field => field.entityType === "company")],
                ticketFields: [...ticketFieldsArray, ...customFieldsArray.filter(field => field.entityType === "ticket")],
                customObjectFields: customObjectFieldsArray
            };

            return data;
        } catch (error) {
            console.error(error);
            throw new errors.InternalServerError(error.message);
        }
    }

    async createWidget(data) {
        try {
            let {
                name,
                themeName,
                colors,
                position,
                labels,
                persona,
                isCompact,
                createdBy,
                clientId,
                workspaceId
            } = data;

            // create widget
            let { data: widgetData, error: widgetError } = await this.supabase.from(this.entityName).insert({ name, clientId, workspaceId, createdBy }).select();


            if (widgetError) {
                throw new errors.InternalServerError(widgetError.message);
            }

            // create widget theme
            let { data: widgetThemeData, error: widgetThemeError } = await this.supabase.from("widgettheme").insert({ name: themeName, colors, position, labels, persona, isCompact, widgetId: widgetData[0].id, createdBy }).select();

            if (widgetThemeError) {
                throw new errors.InternalServerError(widgetThemeError.message);
            }

            // create widget api key
            let { data: widgetApiKeyData, error: widgetApiKeyError } = await this.supabase.from("widgetapikeyrelation").insert({ createdBy, widgetId: widgetData[0].id }).select();

            if (widgetApiKeyError) {
                throw new errors.InternalServerError(widgetApiKeyError.message);
            }
            return {
                widget: widgetData[0],
                widgetTheme: widgetThemeData[0]
            };
        } catch (error) {
            console.error(error);
            throw new errors.InternalServerError(error.message);
        }
    }

    async updateWidget({ clientId, workspaceId, createdBy }, data) {
        try {
            // Get the widget
            const { data: widgetData, error: widgetDataError } = await this.supabase.from(this.entityName).select("*").eq("clientId", clientId).eq("workspaceId", workspaceId).is("deletedAt", null).single();

            if (widgetDataError) {
                throw new errors.InternalServerError(widgetDataError.message);
            }

            if (!widgetData) {
                throw new errors.NotFound("Widget not found");
            }

            // Just update new values in the json do not override existing values
            const { data: widgetTheme, error: widgetThemeError } = await this.supabase.from("widgettheme").select("*").eq("widgetId", widgetData.id).single();

            if (widgetThemeError) {
                throw new errors.InternalServerError(widgetThemeError.message);
            }

            if (!widgetTheme) {
                throw new errors.NotFound("Widget theme not found");
            }


            widgetTheme.name = data.widgetTheme.name;

            // Update colors
            widgetTheme.colors = {
                ...widgetTheme.colors,
                ...data.widgetTheme.colors
            };

            // Update widget theme
            widgetTheme.widgetSettings = {
                ...widgetTheme.widgetSettings,
                ...data.widgetTheme.widgetSettings
            };

            widgetTheme.interfaceSettings = {
                ...widgetTheme.interfaceSettings,
                ...data.widgetTheme.interfaceSettings
            };

            widgetTheme.layout = {
                ...widgetTheme.layout,
                ...data.widgetTheme.layout
            };

            widgetTheme.brandAssets = {
                ...widgetTheme.brandAssets,
                ...data.widgetTheme.brandAssets
            };

            widgetTheme.widgetSettings = {
                ...widgetTheme.widgetSettings,
                ...data.widgetTheme.widgetSettings
            };

            widgetTheme.interfaceSettings = {
                ...widgetTheme.interfaceSettings,
                ...data.widgetTheme.interfaceSettings
            };

            widgetTheme.labels = {
                ...widgetTheme.labels,
                ...data.widgetTheme.labels
            };

            // Update widget theme
            let { data: updatedWidgetTheme, error: updatedWidgetThemeError } = await this.supabase.from("widgettheme").update(widgetTheme).eq("id", widgetTheme.id).select().single();

            if (updatedWidgetThemeError) {
                throw new errors.InternalServerError(updatedWidgetThemeError.message);
            }

            if (data.widgetTheme.widgetField && data.widgetTheme.widgetField.length > 0) {
                // Delete all existing widget fields // TODO: Check if this is the best way to do this
                let { error: deleteWidgetFieldsError } = await this.supabase.from("widgetfield").delete().eq("widgetId", widgetData.id);

                if (deleteWidgetFieldsError) {
                    throw new errors.InternalServerError(deleteWidgetFieldsError.message);
                }

                // Loop over widget fields from front end and create new widget fields
                /* 
                    Example fields body:{
                        entityname: "contact/company/ticket/custom_field/custom_object_field",
                        columnname: "email/phone/address/etc/id of custom field/id of custom object field",
                        label: "Email/Phone/Address etc",
                        type: "text/number/textarea etc",
                        placeholder: "Enter your email/phone/address etc",
                        required: true/false,
                        position: 1/2/3/4/5 etc
                    }
                */

                const standardFields = data.widgetTheme.widgetField.filter(field => field.entityname === "contact" || field.entityname === "company" || field.entityname === "ticket");

                const customFields = data.widgetTheme.widgetField.filter(field => field.entityname === "custom_field");

                const customObjectFields = data.widgetTheme.widgetField.filter(field => field.entityname === "custom_object_field");

                const widgetEntries = [];

                for (const field of standardFields) {
                    widgetEntries.push({
                        createdBy,
                        widgetId: widgetData.id,
                        fieldSourceType: field.entityname,
                        standardFieldName: field.columnname,
                        label: field.label,
                        placeholder: field.placeholder,
                        isRequired: field.required,
                        position: field.position,
                        type: field.type,
                        workspaceId: widgetData.workspaceId,
                        clientId: widgetData.clientId
                    });
                }

                for (const field of customFields) {
                    // fetch custom field data from db
                    const { data: customFieldData, error: customFieldError } = await this.supabase.from("customfields").select("*").eq("id", field.columnname).is("deletedAt", null).single();

                    if (customFieldError) {
                        throw new errors.InternalServerError(customFieldError.message);
                    }

                    widgetEntries.push({
                        createdBy,
                        widgetId: widgetData.id,
                        fieldSourceType: field.entityname,
                        customFieldId: field.columnname,
                        label: customFieldData.name,
                        placeholder: customFieldData.placeholder,
                        isRequired: field.required,
                        position: field.position,
                        type: customFieldData.fieldType,
                        workspaceId: widgetData.workspaceId,
                        clientId: widgetData.clientId
                    });
                }

                for (const field of customObjectFields) {
                    // fetch custom object field data from db
                    const { data: customObjectFieldData, error: customObjectFieldError } = await this.supabase.from("customobjectfields").select("*").eq("id", field.columnname).is("deletedAt", null).single();

                    if (customObjectFieldError) {
                        throw new errors.InternalServerError(customObjectFieldError.message);
                    }

                    widgetEntries.push({
                        createdBy,
                        widgetId: widgetData.id,
                        fieldSourceType: field.entityname,
                        customObjectId: customObjectFieldData.customObjectId,
                        customObjectFieldId: field.columnname,
                        label: customObjectFieldData.name,
                        placeholder: customObjectFieldData.placeholder,
                        isRequired: field.required,
                        position: field.position,
                        type: customObjectFieldData.fieldType,
                        workspaceId: widgetData.workspaceId,
                        clientId: widgetData.clientId
                    });
                }

                // insert widget fields
                let { data: widgetFieldsData, error: widgetFieldsError } = await this.supabase.from("widgetfield").insert(widgetEntries);

                if (widgetFieldsError) {
                    throw new errors.InternalServerError(widgetFieldsError.message);
                }

            }

            return updatedWidgetTheme;
        } catch (error) {
            console.error(error);
            throw new errors.InternalServerError(error.message);
        }
    }

    async deleteWidget({ widgetId, workspaceId, clientId }) {
        try {
            // delete widget
            let { data: widgetData, error: widgetError } = await this.supabase.from(this.entityName).update({ deletedAt: `now()` }).eq("id", widgetId).eq("workspaceId", workspaceId).eq("clientId", clientId);

            if (widgetError) {
                throw new errors.InternalServerError(widgetError.message);
            }

            // delete widget api key
            let { error: widgetApiKeyError } = await this.supabase.from("widgetapikeyrelation").update({ deletedAt: `now()` }).eq("widgetId", widgetId);

            if (widgetApiKeyError) {
                throw new errors.InternalServerError(widgetApiKeyError.message);
            }

            // delete widget theme
            let { error: widgetThemeError } = await this.supabase.from("widgettheme").update({ deletedAt: `now()` }).eq("widgetId", widgetId);

            if (widgetThemeError) {
                throw new errors.InternalServerError(widgetThemeError.message);
            }

            return true;

        } catch (error) {
            console.error(error);
            throw new errors.InternalServerError(error.message);
        }
    }

    async getWidgetById({ widgetId, workspaceId, clientId }) {
        try {
            const { data, error } = await this.supabase.from(this.entityName).select(`
                *,
                widgettheme!widgettheme_widgetId_fkey(id, name, colors, position, labels, persona, isCompact)
            `).eq("id", widgetId).eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null).single();
            if (error) {
                throw new errors.Internal(error.message);
            }
            return data;
        } catch (error) {
            throw new errors.Internal(error.message);
        }
    }

    async getWidgetConfig({ apiKey, workspaceId, publicIpAddress, timezone, domain, authUser = null }) {
        try {
            const { data, error } = await this.supabase.from("widgetapikeyrelation").select("*").eq("apiKey", apiKey).is("deletedAt", null).single();

            if (error) {
                throw new errors.Internal(error.message);
            }

            if (!data) {
                throw new errors.NotFound("Widget not found");
            }

            const { data: widgetData, error: widgetError } = await this.supabase.from(this.entityName).select(`
                *,
                widgettheme!widgettheme_widgetId_fkey(
                colors, brandAssets, layout, widgetSettings, interfaceSettings, labels
                ),
                widgetfield!widgetfield_widgetId_fkey1(*)
            `).eq("id", data.widgetId).eq("workspaceId", workspaceId).is("deletedAt", null).single();
            if (widgetError) {
                throw new errors.Internal(widgetError.message);
            }

            const contactFields = widgetData.widgetfield.filter(field => field.fieldSourceType === "contact");

            const contactFieldsArray = contactFields.length > 0 ? contactFields.map(field => ({
                entityname: "contact",
                columnname: field.standardFieldName, // Use id incase of custom data
                label: field.label,
                type: field.fieldType,
                placeholder: field.placeholder,
                required: field.isRequired,
                position: field.position
            })) : [];

            const companyFields = widgetData.widgetfield.filter(field => field.fieldSourceType === "company");

            const companyFieldsArray = companyFields.length > 0 ? companyFields.map(field => ({
                entityname: "company",
                columnname: field.standardFieldName, // Use id incase of custom data
                label: field.label,
                type: field.fieldType,
                placeholder: field.placeholder,
                required: field.isRequired,
                position: field.position
            })) : [];

            const ticketFields = widgetData.widgetfield.filter(field => field.fieldSourceType === "ticket");

            const ticketFieldsArray = ticketFields.length > 0 ? ticketFields.map(field => ({
                entityname: "ticket",
                columnname: field.standardFieldName, // Use id incase of custom data
                label: field.label,
                type: field.fieldType,
                placeholder: field.placeholder,
                required: field.isRequired,
                position: field.position
            })) : [];

            const customFields = widgetData.widgetfield.filter(field => field.fieldSourceType === "custom_field");

            const customFieldsData = await this.supabase.from("customfields").select("*").in("id", customFields.map(field => field.customFieldId)).is("deletedAt", null);

            const customFieldsArray = customFields.length > 0 ? customFields.map(widgetField => {
                // Find matching custom field data
                const customFieldData = customFieldsData.data.find(cf => cf.id === widgetField.customFieldId);


                return {
                    entityname: "customfield",
                    columnname: widgetField.customFieldId,
                    label: customFieldData.name,
                    type: customFieldData.fieldType,
                    placeholder: customFieldData.placeholder,
                    required: widgetField.isRequired,
                    options: customFieldData.options,
                    position: widgetField.position,
                    entityType: customFieldData.entityType
                };
            }) : [];


            const customObjectFields = widgetData.widgetfield.filter(field => field.fieldSourceType === "custom_object_field");

            const customObjectFieldsData = await this.supabase.from("customobjectfields").select("*").in("id", customObjectFields.map(field => field.customObjectFieldId)).is("deletedAt", null);

            const customObjectFieldsArray = customObjectFields.length > 0 ? customObjectFields.map(widgetField => {
                // Find matching custom field data
                const customFieldData = customObjectFieldsData.data.find(cf => cf.id === widgetField.customObjectFieldId);

                return {
                    entityname: "customobjectfield",
                    columnname: widgetField.customObjectFieldId,
                    label: customFieldData.name,
                    type: customFieldData.fieldType,
                    placeholder: customFieldData.placeholder,
                    required: widgetField.isRequired,
                    options: customFieldData.options,
                    position: widgetField.position,
                    entityType: customFieldData.entityType
                };
            }) : [];

            widgetData.widgetfield = [...contactFieldsArray, ...companyFieldsArray, ...customFieldsArray, ...ticketFieldsArray, ...customObjectFieldsArray];

            const widgetSettings = widgetData.widgettheme[0].widgetSettings;

            if (widgetSettings["allowedDomains"] && !widgetSettings["allowedDomains"].includes(domain)) {
                throw new errors.BadRequest("Domain not allowed");
            }


            if (authUser) {
                // Create a token here! JWT
                // Expiry time is 10 hours
                const token = this.authService.generateJWTToken({ widgetId: data.widgetId, ipAddress: publicIpAddress, timezone, workspaceId, clientId: widgetData.clientId, domain, sessionId: authUser.sessionId, exp: Date.now() + (48 * 60 * 60 * 1000) }); // 48 hours

                const { data: updatedSessionData, error: updateSessionError } = await this.supabase.from("widgetsessions").update({ token: token }).eq("id", authUser.sessionId).select().single();
                if (updateSessionError) {
                    throw new errors.Internal(updateSessionError.message);
                }
                initializeWidgetSession(updatedSessionData.id, widgetData.clientId, widgetData.workspaceId)

                if (updatedSessionData && updatedSessionData.contactId) {
                    const { data: contactData, error: contactError } = await this.supabase.from("customers").select("*").eq("id", updatedSessionData.contactId).is("deletedAt", null).single();
                    return {
                        ...widgetData,
                        accessToken: updatedSessionData.token,
                        contact: contactData,
                        sessionId: updatedSessionData.id
                    };
                }
            }
            return {
                ...widgetData,
            };
        } catch (error) {
            console.error(error);
            throw new errors.Internal(error.message);
        }
    }

    async createContactDevice(requestBody) {
        try {
            let { device, operatingSystem, publicIpAddress, apiKey, name, contact, company, ticket, customfield, customobjectfield } = requestBody;
            if ((!device && !operatingSystem) || !publicIpAddress) {
                throw new errors.BadRequest("Device, operatingSystem and publicIpAddress are required");
            }
            // Check widget api key
            let { data: widgetApiKeyData, error: widgetApiKeyError } = await this.supabase.from("widgetapikeyrelation").select("*").eq("apiKey", apiKey).is("deletedAt", null).single();
            if (widgetApiKeyError || !widgetApiKeyData) {
                throw new errors.Internal(widgetApiKeyError.message);
            }

            // Check widget
            let { data: widgetData, error: widgetError } = await this.supabase.from(this.entityName).select("*").eq("id", widgetApiKeyData.widgetId).is("deletedAt", null).single();
            if (widgetError || !widgetData) {
                throw new errors.Internal(widgetError.message);
            }

            // Process contact data
            let contactUpdateData = {};
            if (contact && Array.isArray(contact)) {
                contact.forEach(field => {
                    if (field.value && field.columnname) {
                        contactUpdateData[field.columnname] = field.value;
                    }
                });
            }

            if (!contactUpdateData.email) {
                throw new errors.BadRequest("Email is required");
            }

            // Check for customer
            let { data: customer, error: customerError } = await this.supabase.from("customers").select("*").eq("email", contactUpdateData.email).eq("workspaceId", widgetData.workspaceId).eq("clientId", widgetData.clientId).is("deletedAt", null).single();
            if (customerError && customerError.code !== "PGRST116") {
                throw new errors.Internal(customerError.message);
            }

            if (!customer) {
                // Create customer if not found
                let firstname = contactUpdateData.firstname || "New";
                let lastname = contactUpdateData.lastname || "Contact";
                let email = contactUpdateData.email;

                if (email === undefined) {
                    throw new errors.BadRequest("Email is required");
                }

                if (name !== undefined) {
                    firstname = name.split(" ")[0];
                    lastname = name.split(" ")[1];
                }

                let { data: newCustomer, error: insertError } = await this.supabase.from("customers")
                    .insert({
                        email,
                        firstname,
                        lastname,
                        ...contactUpdateData,
                        workspaceId: widgetData.workspaceId,
                        clientId: widgetData.clientId,
                        type: "contact"
                    })
                    .select()
                    .single();
                if (insertError) throw insertError;
                customer = newCustomer;
            }

            // Process company data
            if (company && Array.isArray(company)) {
                let companyData = {};
                company.forEach(field => {
                    if (field.value && field.columnname) {
                        companyData[field.columnname] = field.value;
                    }
                });

                if (!companyData.name) {
                    throw new errors.BadRequest("Company name is required");
                }

                const { data: existingCompany, error: existingCompanyError } = await this.supabase.from("companies").select("*").eq("name", companyData.name).eq("workspaceId", widgetData.workspaceId).eq("clientId", widgetData.clientId).is("deletedAt", null).single();

                if (!customer.companyId && !existingCompany) {
                    // Create company if not found
                    let { data: newCompany, error: insertError } = await this.supabase.from("companies")
                        .insert({
                            name: companyData.name,
                        })
                        .select()
                        .single();
                    if (insertError) throw insertError;
                    companyData.id = newCompany.id;

                    // Update customer with company id
                    let { data: updatedCustomer, error: updateError } = await this.supabase.from("customers").update({ companyId: newCompany.id }).eq("id", customer.id).select().single();
                    if (updateError) throw updateError;
                    customer = updatedCustomer;
                } else if (existingCompany) {
                    // Update customer with company id
                    let { data: updatedCustomer, error: updateError } = await this.supabase.from("customers").update({ companyId: existingCompany.id }).eq("id", customer.id).select().single();
                    if (updateError) throw updateError;
                    customer = updatedCustomer;
                }
            }

            // Process ticket data
            if (ticket && Array.isArray(ticket)) {
                let ticketData = {};
                ticket.forEach(field => {
                    if (field.value && field.columnname) {
                        ticketData[field.columnname] = field.value;
                    }
                });
            }

            // // Process custom data
            // if (customfield && Array.isArray(customfield)) {
            //     for (const field of customfield) {
            //         if (field.value) {
            //             let { error: customDataError } = await this.supabase.from("customfielddata")
            //                 .upsert({
            //                     customfieldId: field.columnname, // columnname contains the UUID of the custom field
            //                     data: field.value,
            //                 });
            //             if (customDataError) throw customDataError;
            //         }
            //     }
            // }

            // // Process custom object data
            // if (customobjectfield && Array.isArray(customobjectfield)) {
            //     for (const field of customobjectfield) {
            //         if (field.value) {
            //             let { error: customDataError } = await this.supabase.from("customobjectfielddata")
            //                 .upsert({
            //                     customObjectFieldId: field.columnname, // columnname contains the UUID of the custom object field
            //                     data: field.value,
            //                 });
            //             if (customDataError) throw customDataError;
            //         }
            //     }
            // }

            // check if contactdevice already exists
            let { data: contactDeviceData, error: contactDeviceError } = await this.supabase.from("contactdevice").select("*").eq("publicIpAddress", publicIpAddress).eq("device", device).eq("operatingSystem", operatingSystem).eq("contactId", customer.id).is("deletedAt", null).select().single();

            // PGRST116 is the error code for "no rows returned"
            if (contactDeviceError && contactDeviceError.code !== "PGRST116") {
                throw new errors.Internal(contactDeviceError.message);
            }

            if (!contactDeviceData) {
                // Create contact device
                const { data, error } = await this.supabase.from("contactdevice").insert({ contactId: customer.id, device, operatingSystem, publicIpAddress }).select().single();
                if (error) {
                    throw new errors.Internal(error.message);
                }
                contactDeviceData = data;
            }


            if (contactDeviceData) {
                // Create widgetSession for this contact device
                const { data: widgetSession, error: widgetSessionError } = await this.supabase.from("widgetsessions").insert({ widgetId: widgetApiKeyData.widgetId, ipAddress: publicIpAddress, workspaceId: widgetData.workspaceId, clientId: widgetData.clientId, contactDeviceId: contactDeviceData.id, contactId: customer.id }).select().single();
                if (widgetSessionError) {
                    throw new errors.Internal(widgetSessionError.message);
                }

                const token = this.authService.generateJWTToken({ widgetId: widgetApiKeyData.widgetId, ipAddress: publicIpAddress, workspaceId: widgetData.workspaceId, clientId: widgetData.clientId, sessionId: widgetSession.id, exp: Date.now() + (48 * 60 * 60 * 1000) }); // 48 hours

                initializeWidgetSession(widgetSession.id, widgetData.clientId, widgetData.workspaceId)

                return {
                    ...contactDeviceData,
                    name: customer.firstname + " " + customer.lastname,
                    email: customer.email,
                    accessToken: token,
                    sessionId: widgetSession.id
                };
            } else {
                throw new errors.NotFound("Contact device not found");
            }
        } catch (error) {
            console.error(error);
            throw new errors.Internal(error.message);
        }
    }

    async getContactDeviceTickets(requestBody) {
        try {
            const authUser = requestBody.authUser;

            if (!authUser && !authUser.sessionId) {
                throw new errors.Unauthorized("Unauthorized");
            }
            const { data: sessionData, error: sessionError } = await this.supabase.from("widgetsessions").select("*").eq("id", authUser.sessionId).is("deletedAt", null).single();

            if (sessionError) {
                throw new errors.Internal(sessionError.message);
            }

            if (!sessionData || !sessionData.contactDeviceId) {
                throw new errors.NotFound("Contact device not found");
            }

            const { data, error } = await this.supabase.from("contactdevice").select("*").eq("id", sessionData.contactDeviceId).is("deletedAt", null).single();
            if (error) {
                throw new errors.Internal(error.message);
            }

            if (!data) {
                throw new errors.NotFound("Contact device not found");
            }

            const { data: tickets, error: ticketsError } = await this.supabase.from("tickets").select("*").eq("deviceId", sessionData.contactDeviceId).is("deletedAt", null);
            if (ticketsError) {
                throw new errors.Internal(ticketsError.message);
            }
            // tickets.forEach(async (ticket) => {
            //     const { data: lastMessage, error: lastMessageError } = await this.supabase.from("conversations").select("*").eq("ticketId", ticket.id).order("createdAt", { ascending: false }).limit(1).single();
            //     if (lastMessageError) {
            //         throw new errors.Internal(lastMessageError.message);
            //     }
            //     ticket.lastMessage = lastMessage;
            // });

            return tickets;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async getConversationWithTicketId(ticketId, authUser) {
        try {
            const { workspaceId, clientId, sessionId } = authUser;

            // Check if the widget session is active
            const { data: widgetSession, error: widgetSessionError } = await this.supabase.from("widgetsessions").select("*").eq("id", sessionId).eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null).single();

            if (widgetSessionError) {
                throw new errors.Internal(widgetSessionError.message);
            }

            if (!widgetSession) {
                throw new errors.NotFound("Widget session not found");
            }

            if (widgetSession.status !== "active") {
                throw new errors.BadRequest("Widget session is not active");
            }


            // Check if ticket exists
            const { data: ticket, error: ticketError } = await this.supabase.from("tickets").select("*").eq("id", ticketId).eq("workspaceId", workspaceId).eq("clientId", clientId).eq("deviceId", widgetSession.contactDeviceId).is("deletedAt", null).single();

            if (ticketError) {
                throw new errors.Internal(ticketError.message);
            }

            if (!ticket) {
                throw new errors.NotFound("Ticket not found");
            }

            const { data: conversations, error: conversationsError } = await this.supabase.from("conversations").select("*").eq("ticketId", ticketId).is("deletedAt", null).order("createdAt", { ascending: false }).limit(20);

            if (conversationsError) {
                throw new errors.Internal(conversationsError.message);
            }

            // Reverse the conversation array
            let reversedConversations = conversations.reverse();

            // Step: Fire new_convo event if first access
            // const eventPublisher = new ConversationEventPublisher();

            // await eventPublisher.started({
            //     ticketId: ticket.id,
            //     sessionId: widgetSession.id,
            //     workspaceId,
            //     clientId,
            //     contactDeviceId: widgetSession.contactDeviceId
            // });

            //now listen to ably channel for customer msg
            // handleWidgetConversationEvent(ticketId, clientId, workspaceId, sessionId)
            subscribeToConversationChannels(ticketId, sessionId)

            return reversedConversations;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async uploadWidgetAsset(workspaceId, file) {
        try {
            const bucketName = "pullse";

            // Generate unique key for the file
            const key = `widgets-${workspaceId}-${Date.now()}`;

            const fileBuffer = await fs.readFile(file.tempFilePath);

            // Upload to R2 using PutObjectCommand
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: fileBuffer,
                    ContentType: file.mimetype,
                    ContentLength: file.size
                })
            );

            // Generate and return the file URL
            // Public url https://pub-1db3dea75deb4e36a362d30e3f67bb76.r2.dev
            // Private url https://98d50eb9172903f66dfd5573801dc8b6.r2.cloudflarestorage.com
            const fileUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${process.env.CLOUDFLARE_R2_BUCKET}/${key}`;

            return {
                fileUrl
            };
        } catch (error) {
            console.error('Error uploading file to Cloudflare R2:', error);
            throw new errors.Internal(error.message);
        }
    }

    async getWidgetFieldOptions(workspaceId, clientId) {
        try {
            const tables = [
                {
                    name: "Contact",
                    fields: [{
                        entityType: "contact",
                        columnname: "firstname",
                        label: "First Name",
                        type: "text",
                        placeholder: "Enter first name",
                        table: "contact"
                    },
                    {
                        entityType: "contact",
                        columnname: "lastname",
                        label: "Last Name",
                        type: "text",
                        placeholder: "Enter last name",
                        table: "contact"
                    },
                    {
                        entityType: "contact",
                        columnname: "email",
                        label: "Email",
                        type: "text",
                        placeholder: "Enter email",
                        table: "contact"
                    },
                    {
                        entityType: "contact",
                        columnname: "phone",
                        label: "Phone",
                        type: "text",
                        placeholder: "Enter phone",
                        table: "contact"
                    },
                        // {
                        //     entityType: "contact",
                        //     columnname: "twitter",
                        //     label: "Twitter",
                        //     type: "text",
                        //     placeholder: "Enter twitter",
                        //     table: "contact"
                        // },
                        // {
                        //     entityType: "contact",
                        //     columnname: "linkedin",
                        //     label: "LinkedIn",
                        //     type: "text",
                        //     placeholder: "Enter linkedin",
                        //     table: "contact"
                        // },
                        // {
                        //     entityType: "contact",
                        //     columnname: "address",
                        //     label: "Address",
                        //     type: "text",
                        //     placeholder: "Enter address",
                        //     table: "contact"
                        // }
                    ]
                },
                {
                    name: "Company",
                    fields: [{
                        entityType: "company",
                        columnname: "name",
                        label: "Name",
                        type: "text",
                        placeholder: "Enter company name",
                        table: "company"
                    },
                        // {
                        //     entityType: "company",
                        //     columnname: "description",
                        //     label: "Description",
                        //     type: "text",
                        //     placeholder: "Enter company description",
                        //     table: "company"
                        // },
                        // {
                        //     columnname: "phone",
                        //     label: "Phone",
                        //     type: "text",
                        //     placeholder: "Enter company phone",
                        //     table: "company"
                        // },
                        // {
                        //     entityType: "company",
                        //     columnname: "website",
                        //     label: "Website",
                        //     type: "text",
                        //     placeholder: "Enter company website",
                        //     table: "company"
                        // }
                    ]
                },
                // {
                //     name: "Ticket",
                //     fields: [{
                //         entityType: "ticket",
                //         columnname: "subject",
                //         label: "Subject",
                //         type: "text",
                //         placeholder: "Enter subject",
                //         table: "ticket"
                //     }]
                // }
            ];

            // // Fetch custom fields
            // const { data: customFields, error: customFieldsError } = await this.supabase.from("customfields").select("*").eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null);
            // if (customFieldsError) {
            //     throw new errors.Internal(customFieldsError.message);
            // }

            // const customerCustomFields = customFields.filter(field => field.entityType === "customer");
            // const companyCustomFields = customFields.filter(field => field.entityType === "company");
            // const ticketCustomFields = customFields.filter(field => field.entityType === "ticket");

            // customerCustomFields.forEach(field => {
            //     tables[0].fields.push({
            //         entityType: "custom_field",
            //         columnname: field.id,
            //         label: field.name,
            //         type: field.fieldType,
            //         options: field.options,
            //         placeholder: field.placeholder,
            //         table: "contact"
            //     });
            // });

            // companyCustomFields.forEach(field => {
            //     tables[1].fields.push({
            //         entityType: "custom_field",
            //         columnname: field.id,
            //         label: field.name,
            //         type: field.fieldType,
            //         options: field.options,
            //         placeholder: field.placeholder,
            //         table: "company"
            //     });
            // });

            // ticketCustomFields.forEach(field => {
            //     tables[2].fields.push({
            //         entityType: "custom_field",
            //         columnname: field.id,
            //         label: field.name,
            //         type: field.fieldType,
            //         options: field.options,
            //         placeholder: field.placeholder,
            //         table: "ticket"
            //     });
            // });

            // // List all custom objects and send them as tables with  their custom object fields
            // const { data: customObjects, error: customObjectsError } = await this.supabase.from("customobjects").select("*").eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null).order("createdAt", { ascending: false });

            // if (customObjectsError) {
            //     throw new errors.Internal(customObjectsError.message);
            // }

            // const promises = customObjects.map(async (customObject) => {
            //     const customObjectFields = [];
            //     const { data: customObjectFieldsData, error: customObjectFieldsError } = await this.supabase.from("customobjectfields").select("*").eq("workspaceId", workspaceId).eq("clientId", clientId).eq("customObjectId", customObject.id).is("deletedAt", null).order("createdAt", { ascending: false });

            //     if (customObjectFieldsError) {
            //         throw new errors.Internal(customObjectFieldsError.message);
            //     }
            //     const fieldPromises = customObjectFieldsData.map(field => {
            //         customObjectFields.push({
            //             entityType: "custom_object_field",
            //             columnname: field.id,
            //             label: field.name,
            //             type: field.fieldType,
            //             options: field.options,
            //             placeholder: field.placeholder,
            //             table: customObject.name
            //         });
            //     });
            //     await Promise.all(fieldPromises);
            //     tables.push({
            //         name: customObject.name,
            //         fields: customObjectFields
            //     });
            // });

            // await Promise.all(promises);

            return {
                tables
            }
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async updateTicketRating(requestBody) {
        try {
            const { rating, apiKey, authUser, ticketId } = requestBody;

            // Check if the api key is valid
            const { data: widgetApiKeyRelation, error: widgetApiKeyRelationError } = await this.supabase.from("widgetapikeyrelation").select("*").eq("apiKey", apiKey).is("deletedAt", null).single();

            if (widgetApiKeyRelationError) {
                throw new errors.Internal(widgetApiKeyRelationError.message);
            }

            if (!widgetApiKeyRelation) {
                throw new errors.NotFound("Invalid API key");
            }

            // Check if the widget session is active
            const { data: widgetSession, error: widgetSessionError } = await this.supabase.from("widgetsessions").select("*").eq("id", authUser.sessionId).is("deletedAt", null).single();

            if (widgetSessionError) {
                throw new errors.Internal(widgetSessionError.message);
            }

            if (!widgetSession) {
                throw new errors.NotFound("Widget session not found");
            }

            if (widgetSession.status !== "active") {
                throw new errors.BadRequest("Widget session is not active");
            }

            // Check if the ticket exists
            const { data: ticket, error: ticketError } = await this.supabase.from("tickets").select("*").eq("id", ticketId).is("deletedAt", null).single();

            if (ticketError) {
                throw new errors.Internal(ticketError.message);
            }

            if (!ticket) {
                throw new errors.NotFound("Ticket not found");
            }

            // Update the ticket rating
            const { data: updatedTicket, error: updatedTicketError } = await this.supabase.from("tickets").update({ rating }).eq("id", ticketId).is("deletedAt", null).single();

            if (updatedTicketError) {
                throw new errors.Internal(updatedTicketError.message);
            }

            return updatedTicket;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}

module.exports = WidgetService;