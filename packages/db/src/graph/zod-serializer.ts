import { z } from "zod";

import type { SerializedSchema } from "./types";

/**
 * Serialize a Zod schema to JSON format for storage
 */
export function serializeZodSchema(schema: z.ZodTypeAny): SerializedSchema {
  if (schema instanceof z.ZodString) {
    return { type: "string" };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: "number" };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }

  if (schema instanceof z.ZodDate) {
    return { type: "date" };
  }

  if (schema instanceof z.ZodBigInt) {
    return { type: "bigint" };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: "array",
      element: serializeZodSchema(schema.element),
    };
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const serializedShape: Record<string, SerializedSchema> = {};

    for (const [key, value] of Object.entries(shape)) {
      serializedShape[key] = serializeZodSchema(value);
    }

    return {
      type: "object",
      shape: serializedShape,
    };
  }

  if (schema instanceof z.ZodOptional) {
    return {
      ...serializeZodSchema(schema.unwrap()),
      optional: true,
    };
  }

  if (schema instanceof z.ZodNullable) {
    return {
      ...serializeZodSchema(schema.unwrap()),
      nullable: true,
    };
  }

  if (schema instanceof z.ZodDefault) {
    const inner = serializeZodSchema(schema.removeDefault());
    const defaultValue = schema._def.defaultValue;
    return {
      ...inner,
      default:
        typeof defaultValue === "function" ? defaultValue() : defaultValue,
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: "enum",
      values: schema.options,
    };
  }

  if (schema instanceof z.ZodLiteral) {
    return {
      type: "literal",
      value: schema.value,
    };
  }

  if (schema instanceof z.ZodUnion) {
    return {
      type: "union",
      options: schema.options.map((option) => serializeZodSchema(option)),
    };
  }

  // Fallback for unknown types
  return { type: "unknown" };
}

/**
 * Deserialize JSON back to a Zod schema
 */
export function deserializeZodSchema(
  serialized: SerializedSchema,
): z.ZodTypeAny {
  switch (serialized.type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "boolean":
      return z.boolean();
    case "date":
      return z.date();
    case "bigint":
      return z.bigint();
    case "array": {
      const elementSchema = deserializeZodSchema(
        serialized.element as SerializedSchema,
      );
      return z.array(elementSchema);
    }
    case "object": {
      const shape = serialized.shape as Record<string, SerializedSchema>;
      const zodShape: Record<string, z.ZodTypeAny> = {};

      for (const [key, value] of Object.entries(shape)) {
        zodShape[key] = deserializeZodSchema(value);
      }

      return z.object(zodShape);
    }
    case "enum": {
      const values = serialized.values as string[];
      return z.enum(values as [string, ...string[]]);
    }
    case "literal": {
      const value = serialized.value;
      return z.literal(value);
    }
    case "union": {
      const options = (serialized.options as SerializedSchema[]).map((option) =>
        deserializeZodSchema(option),
      );
      return z.union(
        options as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]],
      );
    }
    default:
      return z.unknown();
  }
}

/**
 * Detect changes between two schemas
 */
export function detectSchemaChanges(
  oldSchema: SerializedSchema,
  newSchema: SerializedSchema,
): Array<{
  type: "added" | "removed" | "changed";
  field: string;
  required?: boolean;
  hasDefault?: boolean;
}> {
  const changes: Array<{
    type: "added" | "removed" | "changed";
    field: string;
    required?: boolean;
    hasDefault?: boolean;
  }> = [];

  if (oldSchema.type !== "object" || newSchema.type !== "object") {
    return changes; // Only compare object schemas
  }

  const oldShape = (oldSchema.shape as Record<string, SerializedSchema>) || {};
  const newShape = (newSchema.shape as Record<string, SerializedSchema>) || {};

  // Check for added fields
  for (const [key, value] of Object.entries(newShape)) {
    if (!(key in oldShape)) {
      changes.push({
        type: "added",
        field: key,
        required: !value.optional,
        hasDefault: !!value.default,
      });
    }
  }

  // Check for removed fields
  for (const [key] of Object.entries(oldShape)) {
    if (!(key in newShape)) {
      changes.push({
        type: "removed",
        field: key,
      });
    }
  }

  // Check for changed fields
  for (const [key, newValue] of Object.entries(newShape)) {
    if (key in oldShape) {
      const oldValue = oldShape[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          type: "changed",
          field: key,
          required: !newValue.optional,
          hasDefault: !!newValue.default,
        });
      }
    }
  }

  return changes;
}
