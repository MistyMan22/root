import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { graph } from "@acme/db/graph";

import { protectedProcedure, publicProcedure } from "../trpc";

export const todoRouter = {
  all: publicProcedure.query(async () => {
    const todos = await graph.element.findByType("todo");
    console.log("🔍 Raw todos from graph DB:", JSON.stringify(todos, null, 2));

    // Transform graph elements to match expected frontend structure
    const transformedTodos = todos
      .filter((todo) => todo.data && typeof todo.data === "object") // Filter out invalid todos
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((todo) => ({
        id: todo.id,
        title: todo.data?.title || "Untitled",
        completed: todo.data?.completed || false,
        priority: todo.data?.priority || "medium",
        completionDate:
          todo.data?.completionDate instanceof Date
            ? todo.data.completionDate
            : new Date(todo.data?.completionDate || new Date().toISOString()),
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      }));

    console.log(
      "🔄 Transformed todos:",
      JSON.stringify(transformedTodos, null, 2),
    );
    return transformedTodos;
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const todo = await graph.element.get(input.id);
      if (!todo || !todo.data || typeof todo.data !== "object") return null;

      return {
        id: todo.id,
        title: todo.data.title || "Untitled",
        completed: todo.data.completed || false,
        priority: todo.data.priority || "medium",
        completionDate:
          todo.data.completionDate instanceof Date
            ? todo.data.completionDate
            : new Date(todo.data.completionDate || new Date().toISOString()),
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().max(256),
        priority: z.enum(["low", "medium", "high"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      console.log("📝 Creating todo with input:", input);
      const created = await graph.element.create({
        typeId: "todo",
        data: {
          title: input.title,
          completed: false,
          priority: input.priority || "medium",
          completionDate: new Date().toISOString(),
        },
      });
      console.log("✅ Created todo:", JSON.stringify(created, null, 2));

      return {
        id: created.id,
        title: created.data?.title || "Untitled",
        completed: created.data?.completed || false,
        priority: created.data?.priority || "medium",
        completionDate:
          created.data?.completionDate instanceof Date
            ? created.data.completionDate
            : new Date(created.data?.completionDate || new Date().toISOString()),
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().max(256).optional(),
        completed: z.boolean().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      console.log("📝 Updating todo with input:", input);

      const updated = await graph.element.update(id, updateData);
      console.log("✅ Updated todo:", JSON.stringify(updated, null, 2));

      return {
        id: updated.id,
        title: updated.data?.title || "Untitled",
        completed: updated.data?.completed || false,
        priority: updated.data?.priority || "medium",
        completionDate:
          updated.data?.completionDate instanceof Date
            ? updated.data.completionDate
            : new Date(updated.data?.completionDate || new Date().toISOString()),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    await graph.element.delete(input);
    return { success: true };
  }),
} satisfies TRPCRouterRecord;
