const errors = require("../errors");
const BaseService = require("./BaseService");
const _ = require("lodash");

class WidgetService extends BaseService {
    constructor() {
        super();
        this.entityName = "widget";
    }

    async getWidgets({ workspaceId, clientId }) {
        try {
            const { data, error } = await this.supabase.from(this.entityName).select(`
                *,
                widgettheme!widgettheme_widgetId_fkey(id, name, colors, position, labels, persona, isCompact)
            `).eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null);
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

    async updateWidget({ widgetId, clientId, workspaceId }, data) {
        try {
            let {
                name,
                themeName,
                colors,
                position,
                labels,
                persona,
                isCompact,
            } = data;

            // update widget theme
            let { data: widgetThemeData, error: widgetThemeError } = await this.supabase.from("widgettheme").update({ name: themeName, colors, position, labels, persona, isCompact, updatedAt: `now()` }).eq("widgetId", widgetId).select();

            if (widgetThemeError) {
                throw new errors.InternalServerError(widgetThemeError.message);
            }

            // update widget
            let { data: widgetData, error: widgetError } = await this.supabase.from(this.entityName).update({ name, updatedAt: `now()` }).eq("id", widgetId).eq("clientId", clientId).eq("workspaceId", workspaceId).select();


            if (widgetError) {
                throw new errors.InternalServerError(widgetError.message);
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

    async getWidgetConfig({ apiKey, workspaceId }) {
        try {
            console.log(apiKey, workspaceId);
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
            return widgetData;
        } catch (error) {
            console.error(error);
            throw new errors.Internal(error.message);
        }
    }

    async createContactDevice(requestBody) {
        try {
            let { device, operatingSystem, publicIpAddress, name, email, apiKey } = requestBody;
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

            // Check for customer
            let { data: customer, error: customerError } = await this.supabase.from("customers").select("*").eq("email", email).eq("workspaceId", widgetData.workspaceId).eq("clientId", widgetData.clientId).is("deletedAt", null).single();
            if (customerError && customerError.code !== "PGRST116") {
                throw new errors.Internal(customerError.message);
            }

            if (!customer) {
                // Create customer if not found
                const firstname = name.split(" ")[0];
                const lastname = name.split(" ")[1];

                let { data: newCustomer, error: insertError } = await this.supabase.from("customers").insert({ email, firstname, lastname, workspaceId: widgetData.workspaceId, clientId: widgetData.clientId, type: "contact" }).select().single();
                if (insertError) throw insertError;
                customer = newCustomer;
            }

            // check if contactdevice already exists
            const { data: contactDeviceData, error: contactDeviceError } = await this.supabase.from("contactdevice").select("*").eq("publicIpAddress", publicIpAddress).eq("device", device).eq("operatingSystem", operatingSystem).eq("contactId", customer.id).is("deletedAt", null).select().single();

            // PGRST116 is the error code for "no rows returned"
            if (contactDeviceError && contactDeviceError.code !== "PGRST116") {
                throw new errors.Internal(contactDeviceError.message);
            }

            if (contactDeviceData) {
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

    async getContactDeviceTickets(contactDeviceId) {
        try {
            const { data, error } = await this.supabase.from("contactdevice").select("*").eq("id", contactDeviceId).is("deletedAt", null).single();
            if (error) {
                throw new errors.Internal(error.message);
            }

            if (!data) {
                throw new errors.NotFound("Contact device not found");
            }

            const { data: tickets, error: ticketsError } = await this.supabase.from("tickets").select("*").eq("deviceId", contactDeviceId).is("deletedAt", null);
            if (ticketsError) {
                throw new errors.Internal(ticketsError.message);
            }
            return tickets;
        } catch (error) {
            console.error(error);
            throw new errors.Internal(error.message);
        }
    }
}

module.exports = WidgetService; 