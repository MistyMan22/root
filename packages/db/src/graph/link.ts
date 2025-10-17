import { and, eq } from "drizzle-orm";

import type { Link, SerializedSchema } from "./types";
import { db } from "../client";
import { element, link, linkType } from "./schema";
import { validateLinkData } from "./validator";
import { deserializeZodSchema } from "./zod-serializer";

/**
 * Create a new link
 */
export async function createLink(params: {
  fromId: string;
  toId: string;
  linkTypeId: string;
  data?: Record<string, unknown>;
}): Promise<Link> {
  // Verify elements exist
  const fromElement = await db.query.element.findFirst({
    where: eq(element.id, params.fromId),
  });
  if (!fromElement) {
    throw new Error(`Source element '${params.fromId}' not found`);
  }

  const toElement = await db.query.element.findFirst({
    where: eq(element.id, params.toId),
  });
  if (!toElement) {
    throw new Error(`Target element '${params.toId}' not found`);
  }

  // Get link type schema
  const typeDef = await db.query.linkType.findFirst({
    where: eq(linkType.id, params.linkTypeId),
  });

  if (!typeDef) {
    throw new Error(`Link type '${params.linkTypeId}' not found`);
  }

  // Validate link data
  const data = params.data || {};
  const schema = deserializeZodSchema(typeDef.schema as SerializedSchema);
  const validation = validateLinkData(data, schema, "strict");

  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }

  // Generate UUID
  const id = crypto.randomUUID();

  // Insert link
  const [newLink] = await db
    .insert(link)
    .values({
      id,
      fromId: params.fromId,
      toId: params.toId,
      linkTypeId: params.linkTypeId,
      data: validation.data,
    })
    .returning();

  return newLink as Link;
}

/**
 * Get link by ID
 */
export async function getLink(id: string): Promise<Link | null> {
  const result = await db.query.link.findFirst({
    where: eq(link.id, id),
  });

  if (!result) {
    return null;
  }

  // Get link type for validation
  const typeDef = await db.query.linkType.findFirst({
    where: eq(linkType.id, result.linkTypeId),
  });

  if (typeDef) {
    // Apply loose validation (defaults, warnings)
    const schema = deserializeZodSchema(typeDef.schema as SerializedSchema);
    const validation = validateLinkData(result.data as Record<string, unknown>, schema, "loose");
    result.data = validation.data;
  }

  return result as Link;
}

/**
 * Update link
 */
export async function updateLink(
  id: string,
  data: Record<string, unknown>,
): Promise<Link> {
  // Get existing link
  const existing = await getLink(id);
  if (!existing) {
    throw new Error(`Link '${id}' not found`);
  }

  // Get link type schema
  const typeDef = await db.query.linkType.findFirst({
    where: eq(linkType.id, existing.linkTypeId),
  });

  if (!typeDef) {
    throw new Error(`Link type '${existing.linkTypeId}' not found`);
  }

  // Validate new data
  const schema = deserializeZodSchema(typeDef.schema as SerializedSchema);
  const validation = validateLinkData(data, schema, "strict");

  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }

  // Update link
  const [updated] = await db
    .update(link)
    .set({
      data: validation.data,
      updatedAt: new Date(),
    })
    .where(eq(link.id, id))
    .returning();

  return updated as Link;
}

/**
 * Delete link
 */
export async function deleteLink(id: string): Promise<void> {
  await db.delete(link).where(eq(link.id, id));
}

/**
 * Find links from an element
 */
export async function findLinksFrom(
  elementId: string,
  linkTypeId?: string,
): Promise<Link[]> {
  const where = linkTypeId
    ? and(eq(link.fromId, elementId), eq(link.linkTypeId, linkTypeId))
    : eq(link.fromId, elementId);

  const results = await db.query.link.findMany({
    where,
  });

  // Apply loose validation to all results
  for (const result of results) {
    const typeDef = await db.query.linkType.findFirst({
      where: eq(linkType.id, result.linkTypeId),
    });

    if (typeDef) {
      const schema = deserializeZodSchema(typeDef.schema as SerializedSchema);
      const validation = validateLinkData(result.data as Record<string, unknown>, schema, "loose");
      result.data = validation.data;
    }
  }

  return results as Link[];
}

/**
 * Find links to an element
 */
export async function findLinksTo(
  elementId: string,
  linkTypeId?: string,
): Promise<Link[]> {
  const where = linkTypeId
    ? and(eq(link.toId, elementId), eq(link.linkTypeId, linkTypeId))
    : eq(link.toId, elementId);

  const results = await db.query.link.findMany({
    where,
  });

  // Apply loose validation to all results
  for (const result of results) {
    const typeDef = await db.query.linkType.findFirst({
      where: eq(linkType.id, result.linkTypeId),
    });

    if (typeDef) {
      const schema = deserializeZodSchema(typeDef.schema as SerializedSchema);
      const validation = validateLinkData(result.data as Record<string, unknown>, schema, "loose");
      result.data = validation.data;
    }
  }

  return results as Link[];
}
