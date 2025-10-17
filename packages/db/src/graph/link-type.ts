import type { z } from "zod";
import { eq } from "drizzle-orm";

import type { LinkType } from "./types";
import { db } from "../client";
import { linkType } from "./schema";
import { serializeZodSchema } from "./zod-serializer";

/**
 * Create link type
 */
export async function createLinkType(params: {
  id: string;
  fromType: string;
  toType: string;
  schema: z.ZodTypeAny;
  parentTypes?: string[];
}): Promise<LinkType> {
  const serializedSchema = serializeZodSchema(params.schema);

  const [newType] = await db
    .insert(linkType)
    .values({
      id: params.id,
      fromType: params.fromType,
      toType: params.toType,
      schema: serializedSchema,
      parentTypes: params.parentTypes || [],
    })
    .returning();

  return newType;
}

/**
 * Get link type by ID
 */
export async function getLinkType(id: string): Promise<LinkType | null> {
  return await db.query.linkType.findFirst({
    where: eq(linkType.id, id),
  });
}

/**
 * Update link type
 */
export async function updateLinkType(
  id: string,
  params: {
    fromType?: string;
    toType?: string;
    schema?: z.ZodTypeAny;
    parentTypes?: string[];
  },
): Promise<LinkType> {
  const updateData: Partial<typeof linkType.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (params.fromType !== undefined) {
    updateData.fromType = params.fromType;
  }

  if (params.toType !== undefined) {
    updateData.toType = params.toType;
  }

  if (params.schema) {
    updateData.schema = serializeZodSchema(params.schema);
  }

  if (params.parentTypes !== undefined) {
    updateData.parentTypes = params.parentTypes;
  }

  const [updated] = await db
    .update(linkType)
    .set(updateData)
    .where(eq(linkType.id, id))
    .returning();

  return updated;
}

/**
 * Delete link type
 */
export async function deleteLinkType(id: string): Promise<void> {
  await db.delete(linkType).where(eq(linkType.id, id));
}

/**
 * List all link types
 */
export async function listLinkTypes(): Promise<LinkType[]> {
  return await db.query.linkType.findMany();
}
