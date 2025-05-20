const errors = require("../errors");
const BaseService = require("./BaseService");

class CustomObjectFieldService extends BaseService {
    constructor() {
        super();
        this.entityName = "customObjectFields";
        this.listingFields = ["id", "customObjectId", "name", "description", "fieldType", "placeholder", "defaultValue", "options", "isRequired", "visibleTo", "entityType", "entityId", "workspaceId", "clientId", "createdBy", "createdAt", "updatedAt"];
    }

    async getCustomObjectField(id) {
        try {
            let { data: customObjectField, error } = await this.supabase
                .from("customObjectFields")
                .select("*")
                .eq("id", id)
                .is("deletedAt", null)
                .single();

            if (error) throw error;

            if (!customObjectField) {
                return Promise.reject(new errors.NotFound("Custom object field not found."));
            }

            return customObjectField;
        } catch (err) {
            return this.handleError(err);
        }
    }

    async validateCustomObjectFieldValue(customObjectField, value) {
        try {
            this.log({ level: "info", message: "Validating custom object field value", data: { customObjectFieldId: customObjectField.id, fieldType: customObjectField.fieldType, value } });

            // If field is required, value should not be empty
            if (customObjectField.isRequired && (value === null || value === undefined || value === "")) {
                this.log({ level: "error", message: "Required field has empty value", data: { customObjectFieldId: customObjectField.id } });
                return Promise.reject(new errors.BadRequest(`Field '${customObjectField.name}' is required.`));
            }

            // If value is empty and field is not required, skip validation
            if (value === null || value === undefined || value === "") {
                if (!customObjectField.isRequired) {
                    this.log({ level: "info", message: "Empty value for non-required field, skipping validation", data: { customObjectFieldId: customObjectField.id } });
                    return true;
                }
            }

            // Validate based on field type
            switch (customObjectField.fieldType) {
                case 'text':
                case 'textarea':
                case 'richtext':
                    // Text fields don't need special validation
                    break;

                case 'number':
                    if (isNaN(Number(value))) {
                        this.log({ level: "error", message: "Invalid number value", data: { customObjectFieldId: customObjectField.id, value } });
                        return Promise.reject(new errors.BadRequest(`Field '${customObjectField.name}' requires a number value.`));
                    }
                    break;

                case 'email':
                    // Simple email validation
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        this.log({ level: "error", message: "Invalid email format", data: { customObjectFieldId: customObjectField.id, value } });
                        return Promise.reject(new errors.BadRequest(`Field '${customObjectField.name}' requires a valid email address.`));
                    }
                    break;

                case 'date':
                    // Check if the value is a valid date
                    if (isNaN(Date.parse(value))) {
                        this.log({ level: "error", message: "Invalid date format", data: { customObjectFieldId: customObjectField.id, value } });
                        return Promise.reject(new errors.BadRequest(`Field '${customObjectField.name}' requires a valid date.`));
                    }
                    break;

                case 'select':
                case 'multiselect':
                    // For select/multiselect, validate against options
                    if (customObjectField.options && customObjectField.options.length > 0) {
                        if (customObjectField.fieldType === 'select') {
                            if (!customObjectField.options.includes(value)) {
                                this.log({ level: "error", message: "Invalid select option", data: { customObjectFieldId: customObjectField.id, value, validOptions: customObjectField.options } });
                                return Promise.reject(new errors.BadRequest(`Field '${customObjectField.name}' requires a value from its options.`));
                            }
                        } else {
                            // For multiselect, value should be an array
                            let valueArray;
                            try {
                                valueArray = Array.isArray(value) ? value : JSON.parse(value);
                            } catch (e) {
                                this.log({ level: "error", message: "Invalid multiselect value format", data: { customObjectFieldId: customObjectField.id, value } });
                                return Promise.reject(new errors.BadRequest(`Field '${customObjectField.name}' requires an array of options.`));
                            }

                            // Check if all values in the array are valid options
                            if (!Array.isArray(valueArray) || !valueArray.every(v => customObjectField.options.includes(v))) {
                                this.log({ level: "error", message: "Invalid multiselect options", data: { customObjectFieldId: customObjectField.id, value: valueArray, validOptions: customObjectField.options } });
                                return Promise.reject(new errors.BadRequest(`Field '${customObjectField.name}' requires valid values from its options.`));
                            }
                        }
                    }
                    break;

                case 'boolean':
                    // Validate boolean value
                    if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== '1' && value !== '0') {
                        this.log({ level: "error", message: "Invalid boolean value", data: { customObjectFieldId: customObjectField.id, value } });
                        return Promise.reject(new errors.BadRequest(`Field '${customObjectField.name}' requires a boolean value.`));
                    }
                    break;

                case 'url':
                    // Simple URL validation
                    try {
                        new URL(value);
                    } catch (e) {
                        this.log({ level: "error", message: "Invalid URL format", data: { customObjectFieldId: customObjectField.id, value } });
                        return Promise.reject(new errors.BadRequest(`Field '${customObjectField.name}' requires a valid URL.`));
                    }
                    break;

                default:
                    // For any other type, no specific validation
                    break;
            }

            this.log({ level: "info", message: "Custom object field validation successful", data: { customObjectFieldId: customObjectField.id } });
            return true;
        } catch (err) {
            this.log({ level: "error", message: "Exception in validateCustomObjectFieldValue", data: { err, customObjectFieldId: customObjectField?.id } });
            return this.handleError(err);
        }
    }
}

module.exports = CustomObjectFieldService; 