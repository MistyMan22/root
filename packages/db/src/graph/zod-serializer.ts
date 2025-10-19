import { z } from "zod";

import type { SerializedSchema } from "./types";

/**
 * Serialize a Zod schema to JSON format for storage
 */
export function serializeZodSchema(schema: z.ZodTypeAny): SerializedSchema {
  // Handle wrapper types first (optional, nullable, default) in the correct order
  if (schema instanceof z.ZodOptional) {
    return {
      ...serializeZodSchema(schema.unwrap() as z.ZodTypeAny),
      optional: true,
    };
  }

  if (schema instanceof z.ZodNullable) {
    return {
      ...serializeZodSchema(schema.unwrap() as z.ZodTypeAny),
      nullable: true,
    };
  }

  if (schema instanceof z.ZodDefault) {
    const inner = serializeZodSchema(schema.removeDefault() as z.ZodTypeAny);
    const defaultValue = schema._def.defaultValue;
    return {
      ...inner,
      default:
        typeof defaultValue === "function"
          ? (defaultValue as () => unknown)()
          : defaultValue,
    };
  }

  // Handle primitive types
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

  if (schema instanceof z.ZodSymbol) {
    return { type: "symbol" };
  }

  if (schema instanceof z.ZodUndefined) {
    return { type: "undefined" };
  }

  if (schema instanceof z.ZodNull) {
    return { type: "null" };
  }

  if (schema instanceof z.ZodVoid) {
    return { type: "void" };
  }

  if (schema instanceof z.ZodAny) {
    return { type: "any" };
  }

  if (schema instanceof z.ZodUnknown) {
    return { type: "unknown" };
  }

  if (schema instanceof z.ZodNever) {
    return { type: "never" };
  }

  // Handle complex types
  if (schema instanceof z.ZodArray) {
    return {
      type: "array",
      element: serializeZodSchema(schema.element as z.ZodTypeAny),
    };
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const serializedShape: Record<string, SerializedSchema> = {};

    for (const [key, value] of Object.entries(shape)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      serializedShape[key] = serializeZodSchema(value);
    }

    return {
      type: "object",
      shape: serializedShape,
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: "enum",
      values: schema.options as string[],
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
      options: schema.options.map((option) =>
        serializeZodSchema(option as z.ZodTypeAny),
      ),
    };
  }

  if (schema instanceof z.ZodIntersection) {
    return {
      type: "intersection",
      left: serializeZodSchema(schema._def.left as z.ZodTypeAny),
      right: serializeZodSchema(schema._def.right as z.ZodTypeAny),
    };
  }

  if (schema instanceof z.ZodTuple) {
    return {
      type: "tuple",
      items: schema._def.items.map((item) =>
        serializeZodSchema(item as z.ZodTypeAny),
      ),
      rest: schema._def.rest
        ? serializeZodSchema(schema._def.rest as z.ZodTypeAny)
        : undefined,
    };
  }

  if (schema instanceof z.ZodRecord) {
    return {
      type: "record",
      key: serializeZodSchema(schema._def.keyType as z.ZodTypeAny),
      value: serializeZodSchema(schema._def.valueType as z.ZodTypeAny),
    };
  }

  if (schema instanceof z.ZodMap) {
    return {
      type: "map",
      key: serializeZodSchema(schema._def.keyType as z.ZodTypeAny),
      value: serializeZodSchema(schema._def.valueType as z.ZodTypeAny),
    };
  }

  if (schema instanceof z.ZodSet) {
    return {
      type: "set",
      value: serializeZodSchema(schema._def.valueType as z.ZodTypeAny),
    };
  }

  if (schema instanceof z.ZodFunction) {
    // Functions are complex to serialize, simplified approach
    return {
      type: "function",
      args: [],
      returns: { type: "unknown" },
    };
  }

  if (schema instanceof z.ZodLazy) {
    return {
      type: "lazy",
      // Note: Lazy schemas can't be fully serialized without evaluation
      // This is a limitation of the serialization approach
    };
  }

  if (schema instanceof z.ZodPromise) {
    return {
      type: "promise",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      inner: serializeZodSchema(schema._def.type as any),
    };
  }

  // Note: Effects, refinements, and transforms can't be fully serialized
  // They would need special handling if required

  // Fallback for unknown types
  return { type: "unknown" };
}

/**
 * Deserialize JSON back to a Zod schema
 */
export function deserializeZodSchema(
  serialized: SerializedSchema,
): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  // Handle primitive types
  switch (serialized.type) {
    case "string":
      schema = z.string();
      break;
    case "number":
      schema = z.number();
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "date":
      schema = z.date();
      break;
    case "bigint":
      schema = z.bigint();
      break;
    case "symbol":
      schema = z.symbol();
      break;
    case "undefined":
      schema = z.undefined();
      break;
    case "null":
      schema = z.null();
      break;
    case "void":
      schema = z.void();
      break;
    case "any":
      schema = z.any();
      break;
    case "unknown":
      schema = z.unknown();
      break;
    case "never":
      schema = z.never();
      break;
    case "array": {
      const elementSchema = deserializeZodSchema(
        serialized.element as SerializedSchema,
      );
      schema = z.array(elementSchema);
      break;
    }
    case "object": {
      const shape = serialized.shape as Record<string, SerializedSchema>;
      const zodShape: Record<string, z.ZodTypeAny> = {};

      for (const [key, value] of Object.entries(shape)) {
        zodShape[key] = deserializeZodSchema(value);
      }

      schema = z.object(zodShape);
      break;
    }
    case "enum": {
      const values = serialized.values as string[];
      schema = z.enum(values as [string, ...string[]]);
      break;
    }
    case "literal": {
      const value = serialized.value as string | number | boolean;
      schema = z.literal(value);
      break;
    }
    case "union": {
      const options = (serialized.options as SerializedSchema[]).map((option) =>
        deserializeZodSchema(option),
      );
      schema = z.union(
        options as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]],
      );
      break;
    }
    case "intersection": {
      const left = deserializeZodSchema(serialized.left as SerializedSchema);
      const right = deserializeZodSchema(serialized.right as SerializedSchema);
      schema = z.intersection(left, right);
      break;
    }
    case "tuple": {
      const items = (serialized.items as SerializedSchema[]).map((item) =>
        deserializeZodSchema(item),
      );
      const rest = serialized.rest
        ? deserializeZodSchema(serialized.rest as SerializedSchema)
        : undefined;
      schema = rest
        ? z.tuple(items as [z.ZodTypeAny, ...z.ZodTypeAny[]], rest)
        : z.tuple(items as [z.ZodTypeAny, ...z.ZodTypeAny[]]);
      break;
    }
    case "record": {
      const key = deserializeZodSchema(
        serialized.key as SerializedSchema,
      ) as z.ZodString;
      const value = deserializeZodSchema(serialized.value as SerializedSchema);
      schema = z.record(key, value);
      break;
    }
    case "map": {
      const key = deserializeZodSchema(serialized.key as SerializedSchema);
      const value = deserializeZodSchema(serialized.value as SerializedSchema);
      schema = z.map(key, value);
      break;
    }
    case "set": {
      const value = deserializeZodSchema(serialized.value as SerializedSchema);
      schema = z.set(value);
      break;
    }
    case "function": {
      // Functions are complex to deserialize, simplified approach
      schema = z.function() as z.ZodTypeAny;
      break;
    }
    case "lazy": {
      // Lazy schemas can't be fully deserialized
      schema = z.any();
      break;
    }
    case "promise": {
      const inner = deserializeZodSchema(serialized.inner as SerializedSchema);
      schema = z.promise(inner);
      break;
    }
    // Note: Effects, refinements, and transforms can't be fully deserialized
    default:
      schema = z.unknown();
  }

  // Apply wrapper types in reverse order (default -> nullable -> optional)
  if (serialized.default !== undefined) {
    schema = schema.default(serialized.default);
  }

  if (serialized.nullable) {
    schema = schema.nullable();
  }

  if (serialized.optional) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Detect changes between two schemas
 */
export function detectSchemaChanges(
  oldSchema: SerializedSchema,
  newSchema: SerializedSchema,
): {
  type: "added" | "removed" | "changed";
  field: string;
  required?: boolean;
  hasDefault?: boolean;
}[] {
  const changes: {
    type: "added" | "removed" | "changed";
    field: string;
    required?: boolean;
    hasDefault?: boolean;
  }[] = [];

  if (oldSchema.type !== "object" || newSchema.type !== "object") {
    return changes; // Only compare object schemas
  }

  const oldShape = (oldSchema.shape as Record<string, SerializedSchema>);
  const newShape = (newSchema.shape as Record<string, SerializedSchema>);

  // Check for added fields
  for (const [key, value] of Object.entries(newShape)) {
    if (!(key in oldShape)) {
      changes.push({
        type: "added",
        field: key,
        required: !value.optional,
        hasDefault: Boolean(value.default),
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
          hasDefault: Boolean(newValue.default),
        });
      }
    }
  }

  return changes;
}
