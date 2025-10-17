import type { z } from "zod";

export interface SerializedSchema {
  type: string;
  [key: string]: unknown;
}

export interface Element {
  id: string;
  typeId: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Link {
  id: string;
  fromId: string;
  toId: string;
  linkTypeId: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ElementType {
  id: string;
  schema: SerializedSchema;
  parentTypes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkType {
  id: string;
  fromType: string;
  toType: string;
  schema: SerializedSchema;
  parentTypes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemaChange {
  type: "added" | "removed" | "changed";
  field: string;
  required?: boolean;
  hasDefault?: boolean;
  oldType?: string;
  newType?: string;
}

export type ValidationMode = "strict" | "loose";
