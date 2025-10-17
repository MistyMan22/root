import { z } from "zod";

import type { SchemaChange, ValidationMode } from "./types";
import { deserializeZodSchema } from "./zod-serializer";

/**
 * Validate data against a schema with different modes
 */
export function validateData(
  data: Record<string, unknown>,
  schema: z.ZodTypeAny,
  mode: ValidationMode = "strict",
): { success: boolean; data: Record<string, unknown>; errors: string[] } {
  const errors: string[] = [];
  let processedData = { ...data };

  try {
    // In loose mode, apply defaults for missing fields
    if (mode === "loose") {
      processedData = applyDefaults(processedData, schema);
    }

    // Validate the data
    const result = schema.safeParse(processedData);

    if (!result.success) {
      // Handle Zod validation errors
      if (
        result.error &&
        result.error.errors &&
        Array.isArray(result.error.errors)
      ) {
        for (const error of result.error.errors) {
          const field = error.path.join(".");
          const message = error.message;
          errors.push(`${field}: ${message}`);
        }
      } else {
        // Fallback for other error types
        errors.push(result.error?.message || "Validation failed");
      }

      if (mode === "strict") {
        return { success: false, data: processedData, errors };
      } else {
        // In loose mode, log warnings but don't fail
        console.warn("Schema validation warnings:", errors);
      }
    }

    return { success: true, data: result.data, errors };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown validation error";
    errors.push(message);
    return { success: false, data: processedData, errors };
  }
}

/**
 * Apply default values to data based on schema
 */
function applyDefaults(
  data: Record<string, unknown>,
  schema: z.ZodTypeAny,
): Record<string, unknown> {
  const result = { ...data };

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;

    for (const [key, fieldSchema] of Object.entries(shape)) {
      if (!(key in result)) {
        const defaultValue = getDefaultValue(fieldSchema);
        if (defaultValue !== undefined) {
          result[key] = defaultValue;
        }
      }
    }
  }

  return result;
}

/**
 * Get default value from a Zod schema
 */
function getDefaultValue(schema: z.ZodTypeAny): unknown {
  if (schema instanceof z.ZodDefault) {
    const defaultValue = schema._def.defaultValue;
    return typeof defaultValue === "function" ? defaultValue() : defaultValue;
  }

  if (schema instanceof z.ZodOptional) {
    return getDefaultValue(schema.unwrap());
  }

  if (schema instanceof z.ZodNullable) {
    return getDefaultValue(schema.unwrap());
  }

  // No default available
  return undefined;
}

/**
 * Check if a schema change is safe (won't break existing data)
 */
export function isSchemaChangeSafe(
  changes: SchemaChange[],
  elementCount: number,
): { safe: boolean; reason?: string } {
  // If no elements exist, any change is safe
  if (elementCount === 0) {
    return { safe: true };
  }

  // Check for unsafe changes
  for (const change of changes) {
    if (change.type === "added" && change.required && !change.hasDefault) {
      return {
        safe: false,
        reason: `Cannot add required field '${change.field}' without default value when ${elementCount} elements exist`,
      };
    }

    if (change.type === "changed" && change.required && !change.hasDefault) {
      return {
        safe: false,
        reason: `Cannot make field '${change.field}' required without default value when ${elementCount} elements exist`,
      };
    }
  }

  return { safe: true };
}

/**
 * Validate element data against element type schema
 */
export function validateElementData(
  data: Record<string, unknown>,
  elementTypeSchema: z.ZodTypeAny,
  mode: ValidationMode = "strict",
): { success: boolean; data: Record<string, unknown>; errors: string[] } {
  return validateData(data, elementTypeSchema, mode);
}

/**
 * Validate link data against link type schema
 */
export function validateLinkData(
  data: Record<string, unknown>,
  linkTypeSchema: z.ZodTypeAny,
  mode: ValidationMode = "strict",
): { success: boolean; data: Record<string, unknown>; errors: string[] } {
  return validateData(data, linkTypeSchema, mode);
}
