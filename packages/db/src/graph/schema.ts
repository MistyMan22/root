import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const element = pgTable(
  "element",
  {
    id: text("id").primaryKey(), // UUID
    typeId: text("type_id").notNull(),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    typeIdIdx: index("element_type_id_idx").on(table.typeId),
  }),
);

export const link = pgTable(
  "link",
  {
    id: text("id").primaryKey(), // UUID
    fromId: text("from_id").notNull(),
    toId: text("to_id").notNull(),
    linkTypeId: text("link_type_id").notNull(),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    fromIdIdx: index("link_from_id_idx").on(table.fromId),
    toIdIdx: index("link_to_id_idx").on(table.toId),
    linkTypeIdIdx: index("link_link_type_id_idx").on(table.linkTypeId),
  }),
);

export const elementType = pgTable("element_type", {
  id: text("id").primaryKey(),
  schema: jsonb("schema").notNull(),
  parentTypes: text("parent_types").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const linkType = pgTable("link_type", {
  id: text("id").primaryKey(),
  fromType: text("from_type").notNull(),
  toType: text("to_type").notNull(),
  schema: jsonb("schema").notNull(),
  parentTypes: text("parent_types").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
