import { eq } from "drizzle-orm";

import type { Element } from "./types";
import { db } from "../client";
import { element, elementType } from "./schema";
import { validateElementData } from "./validator";
import { deserializeZodSchema } from "./zod-serializer";

/**
 * Create a new element
 */
export async function createElement(params: {
  typeId: string;
  data: Record<string, unknown>;
}): Promise<Element> {
  // Get element type schema
  const typeDef = await db.query.elementType.findFirst({
    where: eq(elementType.id, params.typeId),
  });

  if (!typeDef) {
    throw new Error(`Element type '${params.typeId}' not found`);
  }

  // Deserialize and validate schema
  const schema = deserializeZodSchema(typeDef.schema);
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

  return newElement;
}

/**
 * Get element by ID
 */
export async function getElement(id: string): Promise<Element | null> {
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
    const schema = deserializeZodSchema(typeDef.schema);
    const validation = validateElementData(result.data, schema, "loose");
    result.data = validation.data;
  }

  return result;
}

/**
 * Update element
 */
export async function updateElement(
  id: string,
  data: Record<string, unknown>,
): Promise<Element> {
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
  const schema = deserializeZodSchema(typeDef.schema);
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

  return updated;
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
export async function findElementsByType(typeId: string): Promise<Element[]> {
  const results = await db.query.element.findMany({
    where: eq(element.typeId, typeId),
  });

  // Apply loose validation to all results
  const typeDef = await db.query.elementType.findFirst({
    where: eq(elementType.id, typeId),
  });

  if (typeDef) {
    const schema = deserializeZodSchema(typeDef.schema);

    for (const result of results) {
      const validation = validateElementData(result.data, schema, "loose");
      result.data = validation.data;
    }
  }

  return results;
}
