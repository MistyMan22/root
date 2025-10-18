import { eq } from "drizzle-orm";

import type { ElementInputDataById, ElementTypeId } from "./type-definitions";
import type {
  AnyTypedElement,
  ElementWithData,
  SerializedSchema,
} from "./types";
import { db } from "../client";
import { element, elementType } from "./schema";
import { validateElementData } from "./validator";
import { deserializeZodSchema } from "./zod-serializer";

/**
 * Create a new element
 */
export async function createElement<TTypeId extends ElementTypeId>(params: {
  typeId: TTypeId;
  data: ElementInputDataById[TTypeId];
}): Promise<ElementWithData<TTypeId>> {
  // Get element type schema
  const typeDef = await db.query.elementType.findFirst({
    where: eq(elementType.id, params.typeId),
  });

  if (!typeDef) {
    throw new Error(`Element type '${params.typeId}' not found`);
  }

  // Deserialize and validate schema
  const schema = deserializeZodSchema(typeDef.schema as SerializedSchema);
  const validation = validateElementData(params.data, schema, "strict");

  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }

  // Generate UUID
  const id = crypto.randomUUID();

  // Insert element
  const [newElement] = await db
    .insert(element)
    .values({
      id,
      typeId: params.typeId,
      data: validation.data,
    })
    .returning();

  return newElement as ElementWithData<TTypeId>;
}

/**
 * Get element by ID
 */
export async function getElement(id: string): Promise<AnyTypedElement | null> {
  const result = await db.query.element.findFirst({
    where: eq(element.id, id),
  });

  if (!result) {
    return null;
  }

  // Get element type for validation
  const typeDef = await db.query.elementType.findFirst({
    where: eq(elementType.id, result.typeId),
  });

  if (typeDef) {
    // Apply loose validation (defaults, warnings)
    const schema = deserializeZodSchema(typeDef.schema as SerializedSchema);
    const validation = validateElementData(
      result.data as Record<string, unknown>,
      schema,
      "loose",
    );
    result.data = validation.data;
  }

  return result as AnyTypedElement;
}

/**
 * Update element
 */
export async function updateElement<TTypeId extends ElementTypeId>(
  id: string,
  data: ElementInputDataById[TTypeId],
): Promise<ElementWithData<TTypeId>> {
  // Get existing element
  const existing = await getElement(id);
  if (!existing) {
    throw new Error(`Element '${id}' not found`);
  }

  // Get element type schema
  const typeDef = await db.query.elementType.findFirst({
    where: eq(elementType.id, existing.typeId),
  });

  if (!typeDef) {
    throw new Error(`Element type '${existing.typeId}' not found`);
  }

  // Merge existing data with new data
  const mergedData = { ...existing.data, ...data };

  // Validate merged data
  const schema = deserializeZodSchema(typeDef.schema as SerializedSchema);
  const validation = validateElementData(mergedData, schema, "strict");

  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }

  // Update element
  const [updated] = await db
    .update(element)
    .set({
      data: validation.data,
      updatedAt: new Date(),
    })
    .where(eq(element.id, id))
    .returning();

  return updated as ElementWithData<TTypeId>;
}

/**
 * Delete element (cascades to links)
 */
export async function deleteElement(id: string): Promise<void> {
  await db.delete(element).where(eq(element.id, id));
}

/**
 * Find elements by type
 */
export async function findElementsByType<TTypeId extends ElementTypeId>(
  typeId: TTypeId,
): Promise<ElementWithData<TTypeId>[]> {
  const results = await db.query.element.findMany({
    where: eq(element.typeId, typeId),
  });

  // Apply loose validation to all results
  const typeDef = await db.query.elementType.findFirst({
    where: eq(elementType.id, typeId),
  });

  if (typeDef) {
    const schema = deserializeZodSchema(typeDef.schema as SerializedSchema);

    for (const result of results) {
      const validation = validateElementData(
        result.data as Record<string, unknown>,
        schema,
        "loose",
      );
      result.data = validation.data;
    }
  }

  return results as ElementWithData<TTypeId>[];
}
