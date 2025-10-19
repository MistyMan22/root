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
        description: z.string().optional(),
        sessions: z
          .array(
            z.object({
              startTimeDate: z.string().optional(),
              time: z.string().nullable().optional(),
              duration: z.number().nullable().optional(),
              status: z.enum(["completed", "planned", "skipped"]).optional(),
              notes: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      console.log("📝 Creating todo with input:", input);
      const created = await graph.element.create({
        typeId: "todo" as const,
        data: {
          title: input.title,
          description: input.description ?? "",
          completed: false,
          sessions: input.sessions ?? [],
        },
      });
      console.log("✅ Created todo:", JSON.stringify(created, null, 2));

      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().max(256).optional(),
        description: z.string().optional(),
        completed: z.boolean().optional(),
        sessions: z
          .array(
            z.object({
              startTimeDate: z.string().optional(),
              time: z.string().nullable().optional(),
              duration: z.number().nullable().optional(),
              status: z.enum(["completed", "planned", "skipped"]).optional(),
              notes: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...updateDataRaw } = input;
      console.log("📝 Updating todo with input:", input);

      // Create update data with only defined fields
      const updateData: {
        title?: string;
        description?: string;
        completed?: boolean;
        sessions?: {
          startTimeDate?: string;
          time?: string | null;
          duration?: number | null;
          status?: "completed" | "planned" | "skipped";
          notes?: string;
        }[];
      } = {};

      if (updateDataRaw.title !== undefined)
        updateData.title = updateDataRaw.title;
      if (updateDataRaw.description !== undefined)
        updateData.description = updateDataRaw.description;
      if (updateDataRaw.completed !== undefined)
        updateData.completed = updateDataRaw.completed;
      if (updateDataRaw.sessions !== undefined)
        updateData.sessions = updateDataRaw.sessions;

      // @ts-expect-error - Type system is too strict for partial updates
      const updated = await graph.element.update<"todo">(id, updateData);
      console.log("✅ Updated todo:", JSON.stringify(updated, null, 2));

      return updated;
    }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    await graph.element.delete(input);
    return { success: true };
  }),
} satisfies TRPCRouterRecord;
