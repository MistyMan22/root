#!/usr/bin/env node

import { eq } from "drizzle-orm";
// Prefer using compiled dist for JS runtime when available
// Fallback to src if dist is not present
let db, element, elementType, link, linkType;
try {
  ({ db } = await import("../src/client.js"));
  ({ element, elementType, link, linkType } = await import(
    "../src/graph/schema.js"
  ));
} catch (e) {
  ({ db } = await import("../dist/client.js"));
  ({ element, elementType, link, linkType } = await import(
    "../dist/graph/schema.js"
  ));
}
import { elementTypes, linkTypes } from "../src/graph/type-definitions.js";
import { isSchemaChangeSafe } from "../src/graph/validator.js";
import {
  detectSchemaChanges,
  serializeZodSchema,
} from "../src/graph/zod-serializer.js";

async function syncElementTypes() {
  const result = {
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
          parentTypes: typeDef.parentTypes,
        });
        result.added.push(typeId);
        console.log(`  ✅ Added: ${typeId}`);
      } else {
        // Existing type - check for changes
        const changes = detectSchemaChanges(existing.schema, serializedSchema);

        if (changes.length > 0) {
          // Check if change is safe
          // Count existing elements of this type
          const elementCount = await db.query.element.count({
            where: eq(element.typeId, typeId),
          });

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
              parentTypes: typeDef.parentTypes,
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

async function syncLinkTypes() {
  const result = {
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
          parentTypes: typeDef.parentTypes,
        });
        result.added.push(typeId);
        console.log(`  ✅ Added: ${typeId}`);
      } else {
        // Existing type - check for changes
        const changes = detectSchemaChanges(existing.schema, serializedSchema);

        if (changes.length > 0) {
          // Check if change is safe
          // Count existing links of this type
          const linkCount = await db.query.link.count({
            where: eq(link.linkTypeId, typeId),
          });

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
              parentTypes: typeDef.parentTypes,
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

async function main() {
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
      console.log("\nTo remove orphaned types, run with --prune flag");
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

// Handle --prune flag
if (process.argv.includes("--prune")) {
  console.log("🗑️  Prune mode not implemented yet");
  console.log("   Orphaned types will be listed but not removed");
}

main();
