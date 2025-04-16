const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");
const AuthService = require("./AuthService");
const ConversationEventPublisher = require("../Events/ConversationEvent/ConversationEventPublisher");
const { handleWidgetContactEvent, handleWidgetConversationEvent, setAblyTicketChatListener } = require("../ExternalService/ablyListener");
class WidgetService extends BaseService {
    constructor() {
        super();
        this.entityName = "widget";
        this.authService = new AuthService();
    }

    async getWidgets({ workspaceId, clientId }) {
        try {
            const { data, error } = await this.supabase.from(this.entityName).select(`
                *,
                widgettheme!widgettheme_widgetId_fkey(id, name, colors, labels,widgetId, layout, brandAssets, widgetSettings, interfaceSettings)
            `).eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null).single();
            console.log(data, error);
            if (error) {
                throw new errors.InternalServerError(error.message);
            }
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

    async updateWidget({ clientId, workspaceId }, data) {
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
            console.log(apiKey, workspaceId, publicIpAddress, timezone, domain, authUser);
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
                widgetfield!widgetfield_widgetId_fkey(*)
            `).eq("id", data.widgetId).eq("workspaceId", workspaceId).is("deletedAt", null).single();
            if (widgetError) {
                throw new errors.Internal(widgetError.message);
            }

            const customDataFieldsIds = widgetData.widgetfield[0].customDataFields;

            const { data: customDataFields, error: customFieldsError } = await this.supabase.from("customfields").select("*").in("id", customDataFieldsIds).is("deletedAt", null);

            if (customFieldsError) {
                console.error("Error fetching custom fields:", customFieldsError);
            }

            if (customDataFields && customDataFields.length > 0) {
                let customDataFieldsArray = [];
                customDataFields.forEach((field) => {
                    customDataFieldsArray.push({
                        entityname: "customfield",
                        columnname: field.id, // Use id incase of custom data
                        label: field.name,
                        type: field.fieldType,
                        placeholder: field.placeholder,
                        required: field.isRequired,
                        options: field.options
                    });
                });
                widgetData.widgetfield[0].customDataFields = customDataFieldsArray;
            }

            const widgetSettings = widgetData.widgettheme[0].widgetSettings;

            if (widgetSettings["allowedDomains"] && !widgetSettings["allowedDomains"].includes(domain)) {
                throw new errors.BadRequest("Domain not allowed");
            }


            if (authUser) {
                // Create a token here! JWT
                // Expiry time is 10 hours
                const token = this.authService.generateJWTToken({ widgetId: data.widgetId, ipAddress: publicIpAddress, timezone, workspaceId, clientId: widgetData.clientId, domain, sessionId: authUser.sessionId, exp: Date.now() + (10 * 60 * 60 * 1000) });

                const { data: updatedSessionData, error: updateSessionError } = await this.supabase.from("widgetsessions").update({ token: token }).eq("id", authUser.sessionId).select().single();
                if (updateSessionError) {
                    throw new errors.Internal(updateSessionError.message);
                }

                handleWidgetContactEvent(updatedSessionData.id, widgetData.clientId, widgetData.workspaceId)
                if (updatedSessionData && updatedSessionData.contactId) {
                    const { data: contactData, error: contactError } = await this.supabase.from("customers").select("*").eq("id", updatedSessionData.contactId).is("deletedAt", null).single();
                    handleWidgetContactEvent(updatedSessionData.id, widgetData.clientId, widgetData.workspaceId);
                    return {
                        ...widgetData,
                        accessToken: updatedSessionData.token,
                        contact: contactData,
                        sessionId: updatedSessionData.id
                    };
                } else {
                    handleWidgetContactEvent(updatedSessionData.id, widgetData.clientId, widgetData.workspaceId);
                    return {
                        ...widgetData,
                        accessToken: updatedSessionData.token,
                        sessionId: updatedSessionData.id
                    };
                }
            } else {
                const expiryDate = new Date();
                expiryDate.setHours(expiryDate.getHours() + 24);

                // Convert to ISO string which is compatible with PostgreSQL timestamptz
                const expiryTimestamptz = expiryDate.toISOString(); // e.g. "2023-07-15T10:30:00.000Z"

                const { data: sessionData, error: sessionError } = await this.supabase.from("widgetsessions").insert({ widgetId: data.widgetId, ipAddress: publicIpAddress, timezone, workspaceId, clientId: widgetData.clientId, domain, widgetApiKey: data.id, status: "active", expiry: expiryTimestamptz }).select().single();

                if (sessionError) {
                    throw new errors.Internal(sessionError.message);
                }
                // Create a token here! JWT
                // Expiry time is 10 hours
                const token = this.authService.generateJWTToken({ widgetId: data.widgetId, ipAddress: publicIpAddress, timezone, workspaceId, clientId: widgetData.clientId, domain, sessionId: sessionData.id, exp: Date.now() + (10 * 60 * 60 * 1000) });

                // Update session with token
                const { data: updatedSessionData, error: updateSessionError } = await this.supabase.from("widgetsessions").update({ token }).eq("id", sessionData.id).select().single();

                if (updateSessionError) {
                    throw new errors.Internal(updateSessionError.message);
                }

                handleWidgetContactEvent(sessionData.id, widgetData.clientId, widgetData.workspaceId)
                return {
                    ...widgetData,
                    accessToken: updatedSessionData.token,
                    sessionId: sessionData.id
                };
            }
            handleWidgetContactEvent(sessionData.id, widgetData.clientId, widgetData.workspaceId);

        } catch (error) {
            console.error(error);
            throw new errors.Internal(error.message);
        }
    }

    async createContactDevice(requestBody) {
        try {
            let { device, operatingSystem, publicIpAddress, apiKey, name, authUser, contact, company, customData } = requestBody;
            if ((!device && !operatingSystem) || !publicIpAddress) {
                throw new errors.BadRequest("Device, operatingSystem and publicIpAddress are required");
            }
            console.log("requestBody", device, operatingSystem, publicIpAddress, apiKey, name, authUser, contact, company, customData);
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
            }

            // Process custom data
            if (customData && Array.isArray(customData)) {
                for (const field of customData) {
                    if (field.value) {
                        let { error: customDataError } = await this.supabase.from("customfielddata")
                            .upsert({
                                customfieldId: field.columnname, // columnname contains the UUID of the custom field
                                data: field.value,
                            });
                        if (customDataError) throw customDataError;
                    }
                }
            }

            // check if contactdevice already exists
            const { data: contactDeviceData, error: contactDeviceError } = await this.supabase.from("contactdevice").select("*").eq("publicIpAddress", publicIpAddress).eq("device", device).eq("operatingSystem", operatingSystem).eq("contactId", customer.id).is("deletedAt", null).select().single();

            // PGRST116 is the error code for "no rows returned"
            if (contactDeviceError && contactDeviceError.code !== "PGRST116") {
                throw new errors.Internal(contactDeviceError.message);
            }

            if (contactDeviceData) {
                // Update widget sessions with contact device id and contact id
                let { data: widgetSessions, error: widgetSessionsError } = await this.supabase.from("widgetsessions").update({ contactDeviceId: contactDeviceData.id, contactId: customer.id }).eq("widgetId", widgetApiKeyData.widgetId).eq("id", authUser.sessionId).is("deletedAt", null);
                if (widgetSessionsError) {
                    throw new errors.Internal(widgetSessionsError.message);
                }

                return {
                    ...contactDeviceData,
                    name: customer.firstname + " " + customer.lastname,
                    email: customer.email,
                };
            }

            const { data, error } = await this.supabase.from("contactdevice").insert({ contactId: customer.id, device, operatingSystem, publicIpAddress }).select().single();
            if (error) {
                throw new errors.Internal(error.message);
            }

            // Update widget sessions with contact device id and contact id
            let { data: widgetSessions, error: widgetSessionsError } = await this.supabase.from("widgetsessions").update({ contactDeviceId: data.id, contactId: customer.id }).eq("widgetId", widgetApiKeyData.widgetId).eq("id", authUser.sessionId).is("deletedAt", null);
            if (widgetSessionsError) {
                throw new errors.Internal(widgetSessionsError.message);
            }

            return {
                ...data,
                name: customer.firstname + " " + customer.lastname,
                email: customer.email,
            };
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
            console.log("authUser", authUser);
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

            console.log("widgetSession", workspaceId, clientId);

            // Check if ticket exists
            const { data: ticket, error: ticketError } = await this.supabase.from("tickets").select("*").eq("id", ticketId).eq("workspaceId", workspaceId).eq("clientId", clientId).eq("deviceId", widgetSession.contactDeviceId).is("deletedAt", null).single();

            if (ticketError) {
                throw new errors.Internal(ticketError.message);
            }

            if (!ticket) {
                throw new errors.NotFound("Ticket not found");
            }

            const { data: conversations, error: conversationsError } = await this.supabase.from("conversations").select("*").eq("ticketId", ticketId).is("deletedAt", null).limit(20);

            if (conversationsError) {
                throw new errors.Internal(conversationsError.message);
            }

            // Step: Fire new_convo event if first access
            const eventPublisher = new ConversationEventPublisher();

            await eventPublisher.started({
                ticketId: ticket.id,
                sessionId: widgetSession.id,
                workspaceId,
                clientId,
                contactDeviceId: widgetSession.contactDeviceId
            });

            //now listen to ably channel for customer msg
            setAblyTicketChatListener(ticketId, clientId, workspaceId)


            return conversations;

        } catch (error) {
            console.error(error);
            throw error;
        }
    }

}

module.exports = WidgetService; 