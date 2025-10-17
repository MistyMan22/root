#!/usr/bin/env node
import { eq, or, sql } from "drizzle-orm";

import { db } from "../src/client";
import { element, elementType, link, linkType } from "../src/graph/schema";
import { elementTypes, linkTypes } from "../src/graph/type-definitions";
import { isSchemaChangeSafe } from "../src/graph/validator";
import {
  detectSchemaChanges,
  serializeZodSchema,
} from "../src/graph/zod-serializer";

interface SyncResult {
  added: string[];
  updated: string[];
  orphaned: string[];
  errors: string[];
}

async function syncElementTypes(): Promise<SyncResult> {
  const result: SyncResult = {
    added: [],
    updated: [],
    orphaned: [],
    errors: [],
  };

  console.log("🔄 Syncing element types...");

  // Get existing element types from database
  const existingTypes = await db.query.elementType.findMany();
  const existingTypeMap = new Map(existingTypes.map((t) => [t.id, t]));

  // Process each type in code
  for (const [typeId, typeDef] of Object.entries(elementTypes)) {
    try {
      const serializedSchema = serializeZodSchema(typeDef.schema);
      const existing = existingTypeMap.get(typeId);

      if (!existing) {
        // New type - add it
        await db.insert(elementType).values({
          id: typeId,
          schema: serializedSchema,
          parentTypes: (typeDef.parentTypes || []) as string[],
        });
        result.added.push(typeId);
        console.log(`  ✅ Added: ${typeId}`);
      } else {
        // Existing type - check for changes
        const changes = detectSchemaChanges(
          existing.schema as any,
          serializedSchema,
        );

        if (changes.length > 0) {
          // Check if change is safe
          // Count existing elements of this type
          const elementCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(element)
            .where(eq(element.typeId, typeId));
          const elementCount = Number(elementCountResult[0]?.count ?? 0);

          const safetyCheck = isSchemaChangeSafe(changes, elementCount);

          if (!safetyCheck.safe) {
            result.errors.push(
              `Cannot update ${typeId}: ${safetyCheck.reason}`,
            );
            console.log(`  ❌ ${typeId}: ${safetyCheck.reason}`);
            continue;
          }

          // Update the type
          await db
            .update(elementType)
            .set({
              schema: serializedSchema,
              parentTypes: (typeDef.parentTypes || []) as string[],
              updatedAt: new Date(),
            })
            .where(eq(elementType.id, typeId));

          result.updated.push(typeId);
          console.log(`  🔄 Updated: ${typeId}`);
        } else {
          console.log(`  ✓ No changes: ${typeId}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Failed to process ${typeId}: ${message}`);
      console.log(`  ❌ ${typeId}: ${message}`);
    }
  }

  // Check for orphaned types (in DB but not in code)
  for (const [typeId] of existingTypeMap) {
    if (!(typeId in elementTypes)) {
      result.orphaned.push(typeId);
      console.log(`  ⚠️  Orphaned: ${typeId}`);
    }
  }

  return result;
}

async function syncLinkTypes(): Promise<SyncResult> {
  const result: SyncResult = {
    added: [],
    updated: [],
    orphaned: [],
    errors: [],
  };

  console.log("🔄 Syncing link types...");

  // Get existing link types from database
  const existingTypes = await db.query.linkType.findMany();
  const existingTypeMap = new Map(existingTypes.map((t) => [t.id, t]));

  // Process each type in code
  for (const [typeId, typeDef] of Object.entries(linkTypes)) {
    try {
      const serializedSchema = serializeZodSchema(typeDef.schema);
      const existing = existingTypeMap.get(typeId);

      if (!existing) {
        // New type - add it
        await db.insert(linkType).values({
          id: typeId,
          fromType: typeDef.fromType,
          toType: typeDef.toType,
          schema: serializedSchema,
          parentTypes: (typeDef.parentTypes || []) as string[],
        });
        result.added.push(typeId);
        console.log(`  ✅ Added: ${typeId}`);
      } else {
        // Existing type - check for changes
        const changes = detectSchemaChanges(
          existing.schema as any,
          serializedSchema,
        );

        if (changes.length > 0) {
          // Check if change is safe
          // Count existing links of this type
          const linkCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(link)
            .where(eq(link.linkTypeId, typeId));
          const linkCount = Number(linkCountResult[0]?.count ?? 0);

          const safetyCheck = isSchemaChangeSafe(changes, linkCount);

          if (!safetyCheck.safe) {
            result.errors.push(
              `Cannot update ${typeId}: ${safetyCheck.reason}`,
            );
            console.log(`  ❌ ${typeId}: ${safetyCheck.reason}`);
            continue;
          }

          // Update the type
          await db
            .update(linkType)
            .set({
              fromType: typeDef.fromType,
              toType: typeDef.toType,
              schema: serializedSchema,
              parentTypes: (typeDef.parentTypes || []) as string[],
              updatedAt: new Date(),
            })
            .where(eq(linkType.id, typeId));

          result.updated.push(typeId);
          console.log(`  🔄 Updated: ${typeId}`);
        } else {
          console.log(`  ✓ No changes: ${typeId}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(`Failed to process ${typeId}: ${message}`);
      console.log(`  ❌ ${typeId}: ${message}`);
    }
  }

  // Check for orphaned types (in DB but not in code)
  for (const [typeId] of existingTypeMap) {
    if (!(typeId in linkTypes)) {
      result.orphaned.push(typeId);
      console.log(`  ⚠️  Orphaned: ${typeId}`);
    }
  }

  return result;
}

async function pruneOrphanedTypes(
  orphanedElementTypes: string[],
  orphanedLinkTypes: string[],
): Promise<void> {
  console.log("\n🗑️  Pruning orphaned types...");

  // First, remove all links that reference orphaned link types
  for (const linkTypeId of orphanedLinkTypes) {
    const linkCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(link)
      .where(eq(link.linkTypeId, linkTypeId));
    const linkCount = Number(linkCountResult[0]?.count ?? 0);

    if (linkCount > 0) {
      console.log(`  🗑️  Removing ${linkCount} links of type: ${linkTypeId}`);
      await db.delete(link).where(eq(link.linkTypeId, linkTypeId));
    }

    // Remove the link type definition
    await db.delete(linkType).where(eq(linkType.id, linkTypeId));
    console.log(`  ✅ Removed link type: ${linkTypeId}`);
  }

  // Then, remove all elements that reference orphaned element types
  for (const elementTypeId of orphanedElementTypes) {
    const elementCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(element)
      .where(eq(element.typeId, elementTypeId));
    const elementCount = Number(elementCountResult[0]?.count ?? 0);

    if (elementCount > 0) {
      console.log(
        `  🗑️  Removing ${elementCount} elements of type: ${elementTypeId}`,
      );

      // First remove all links that reference these elements
      const elementsToDelete = await db.query.element.findMany({
        where: eq(element.typeId, elementTypeId),
        columns: { id: true },
      });

      const elementIds = elementsToDelete.map((e) => e.id);

      if (elementIds.length > 0) {
        // Remove links where these elements are source or target
        await db
          .delete(link)
          .where(
            or(eq(link.fromId, elementIds[0]), eq(link.toId, elementIds[0])),
          );

        // Remove remaining links in batches if there are many elements
        for (let i = 1; i < elementIds.length; i++) {
          await db
            .delete(link)
            .where(
              or(eq(link.fromId, elementIds[i]), eq(link.toId, elementIds[i])),
            );
        }
      }

      // Now remove the elements themselves
      await db.delete(element).where(eq(element.typeId, elementTypeId));
    }

    // Remove the element type definition
    await db.delete(elementType).where(eq(elementType.id, elementTypeId));
    console.log(`  ✅ Removed element type: ${elementTypeId}`);
  }
}

async function main() {
  const isPruneMode = process.argv.includes("--prune");

  if (isPruneMode) {
    console.log("🗑️  Prune mode enabled - orphaned types will be removed");
  }

  console.log("🚀 Starting graph type sync...\n");

  try {
    const [elementResult, linkResult] = await Promise.all([
      syncElementTypes(),
      syncLinkTypes(),
    ]);

    console.log("\n📊 Sync Summary:");
    console.log(
      `  Added: ${elementResult.added.length + linkResult.added.length}`,
    );
    console.log(
      `  Updated: ${elementResult.updated.length + linkResult.updated.length}`,
    );
    console.log(
      `  Orphaned: ${elementResult.orphaned.length + linkResult.orphaned.length}`,
    );
    console.log(
      `  Errors: ${elementResult.errors.length + linkResult.errors.length}`,
    );

    if (elementResult.orphaned.length > 0 || linkResult.orphaned.length > 0) {
      console.log("\n⚠️  Orphaned types found in database but not in code:");
      [...elementResult.orphaned, ...linkResult.orphaned].forEach((id) => {
        console.log(`    - ${id}`);
      });

      if (isPruneMode) {
        await pruneOrphanedTypes(elementResult.orphaned, linkResult.orphaned);
        console.log("\n✅ Pruning completed successfully!");
      } else {
        console.log("\nTo remove orphaned types, run with --prune flag");
      }
    }

    if (elementResult.errors.length > 0 || linkResult.errors.length > 0) {
      console.log("\n❌ Errors occurred:");
      [...elementResult.errors, ...linkResult.errors].forEach((error) => {
        console.log(`    - ${error}`);
      });
      process.exit(1);
    }

    console.log("\n✅ Sync completed successfully!");
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
}

main();
