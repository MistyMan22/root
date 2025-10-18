import type { z } from "zod";
import { eq } from "drizzle-orm";

import type { ElementType } from "./types";
import { db } from "../client";
import { elementType } from "./schema";
import { serializeZodSchema } from "./zod-serializer";

/**
 * Create element type
 */
export async function createElementType(params: {
  id: string;
  schema: z.ZodTypeAny;
  parentTypes?: string[];
}): Promise<ElementType> {
  const serializedSchema = serializeZodSchema(params.schema);

  const [newType] = await db
    .insert(elementType)
    .values({
      id: params.id,
      schema: serializedSchema,
      parentTypes: params.parentTypes ?? [],
    })
    .returning();

  return newType as ElementType;
}

/**
 * Get element type by ID
 */
export async function getElementType(id: string): Promise<ElementType | null> {
  const result = await db.query.elementType.findFirst({
    where: eq(elementType.id, id),
  });
  return result as ElementType | null;
}

/**
 * Update element type
 */
export async function updateElementType(
  id: string,
  params: {
    schema?: z.ZodTypeAny;
    parentTypes?: string[];
  },
): Promise<ElementType> {
  const updateData: Partial<typeof elementType.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (params.schema) {
    updateData.schema = serializeZodSchema(params.schema);
  }

  if (params.parentTypes !== undefined) {
    updateData.parentTypes = params.parentTypes;
  }

  const [updated] = await db
    .update(elementType)
    .set(updateData)
    .where(eq(elementType.id, id))
    .returning();

  return updated as ElementType;
}

/**
 * Delete element type
 */
export async function deleteElementType(id: string): Promise<void> {
  await db.delete(elementType).where(eq(elementType.id, id));
}

/**
 * List all element types
 */
export async function listElementTypes(): Promise<ElementType[]> {
  const results = await db.query.elementType.findMany();
  return results as ElementType[];
}
