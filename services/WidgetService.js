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

    async getWidgetConfig({ apiKey, workspaceId, clientId }) {
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
                widgettheme!widgettheme_widgetId_fkey(id, name, colors, position, labels, persona, isCompact)
            `).eq("id", data.widgetId).eq("workspaceId", workspaceId).eq("clientId", clientId).is("deletedAt", null).single();
            if (widgetError) {
                throw new errors.Internal(widgetError.message);
            }
            return widgetData;
        } catch (error) {
            console.error(error);
            throw new errors.Internal(error.message);
        }
    }
}

module.exports = WidgetService; 