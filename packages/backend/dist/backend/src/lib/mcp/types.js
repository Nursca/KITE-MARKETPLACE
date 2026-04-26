"use strict";
/**
 * MCP Types - Shared types for the modular MCP system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodToJsonSchema = zodToJsonSchema;
/**
 * Get the type name from a zod schema
 */
function getZodTypeName(schema) {
    const def = schema._def;
    return def?.typeName;
}
/**
 * Get the inner type from an optional schema
 */
function unwrapOptional(schema) {
    const typeName = getZodTypeName(schema);
    if (typeName === "ZodOptional") {
        const def = schema._def;
        return { schema: def.innerType, isOptional: true };
    }
    return { schema, isOptional: false };
}
/**
 * Get description from a zod schema
 */
function getDescription(schema) {
    const def = schema._def;
    return def?.description;
}
/**
 * Convert Zod schema to JSON Schema for MCP tools/list
 */
function zodToJsonSchema(schema) {
    const typeName = getZodTypeName(schema);
    // Handle ZodObject
    if (typeName === "ZodObject") {
        const shape = schema.shape;
        const properties = {};
        const required = [];
        for (const [key, value] of Object.entries(shape)) {
            const fieldSchema = value;
            // Get the inner type if optional
            const { schema: innerSchema, isOptional } = unwrapOptional(fieldSchema);
            const innerTypeName = getZodTypeName(innerSchema);
            // Build property definition
            const prop = {};
            switch (innerTypeName) {
                case "ZodString":
                    prop.type = "string";
                    break;
                case "ZodNumber":
                    prop.type = "number";
                    break;
                case "ZodBoolean":
                    prop.type = "boolean";
                    break;
                case "ZodArray":
                    prop.type = "array";
                    // Recursively handle array items
                    const arrayDef = innerSchema._def;
                    if (arrayDef?.type) {
                        const itemSchema = zodToJsonSchema(arrayDef.type);
                        prop.items = itemSchema;
                    }
                    break;
                case "ZodObject":
                    const nested = zodToJsonSchema(innerSchema);
                    prop.type = nested.type;
                    prop.properties = nested.properties;
                    if (nested.required.length > 0) {
                        prop.required = nested.required;
                    }
                    break;
                default:
                    prop.type = "string"; // fallback
            }
            // Add description if available
            const description = getDescription(innerSchema);
            if (description) {
                prop.description = description;
            }
            properties[key] = prop;
            if (!isOptional) {
                required.push(key);
            }
        }
        return { type: "object", properties, required };
    }
    // Fallback for non-object schemas
    return { type: "object", properties: {}, required: [] };
}
