import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { graph } from "@acme/db/graph";

import { protectedProcedure, publicProcedure } from "../trpc";

export const todoRouter = {
  all: publicProcedure.query(async () => {
    const todos = await graph.element.findByType("todo");
    console.log("🔍 Raw todos from graph DB:", JSON.stringify(todos, null, 2));
    return todos;
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const todo = await graph.element.get<"todo">(input.id);
      if (!todo?.data || typeof todo.data !== "object") return null;

      return todo;
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
        typeId: "todo" as const,
        data: {
          title: input.title,
          completed: false,
          priority: input.priority,
          completionDate: new Date().toISOString(),
        },
      });
      console.log("✅ Created todo:", JSON.stringify(created, null, 2));

      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().max(256).optional().default("element"),
        completed: z.boolean().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;
      console.log("📝 Updating todo with input:", input);

      const updated = await graph.element.update<"todo">(id, updateData);
      console.log("✅ Updated todo:", JSON.stringify(updated, null, 2));

      return updated;
    }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    await graph.element.delete(input);
    return { success: true };
  }),
} satisfies TRPCRouterRecord;
