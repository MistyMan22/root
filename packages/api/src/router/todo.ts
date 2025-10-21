import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { graph } from "@acme/db/graph";

import { protectedProcedure, publicProcedure } from "../trpc";

export const todoRouter = {
  all: publicProcedure
    .input(z.object({ listId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      if (input?.listId) {
        // Filter todos by list
        const links = await graph.link.findTo(input.listId, "taskToList");
        const todoIds = links.map((link) => link.fromId);

        // Fetch todos by IDs
        const todos = await Promise.all(
          todoIds.map((id) => graph.element.get(id)),
        );

        const validTodos = todos.filter(
          (todo): todo is NonNullable<typeof todo> =>
            todo !== null && todo.typeId === "todo",
        );

        console.log(
          "🔍 Filtered todos from list:",
          JSON.stringify(validTodos, null, 2),
        );
        return validTodos;
      } else {
        // Return all todos
        const todos = await graph.element.findByType("todo");
        console.log(
          "🔍 Raw todos from graph DB:",
          JSON.stringify(todos, null, 2),
        );
        return todos;
      }
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const todo = await graph.element.get<"todo">(input.id);
      if (!todo?.data || typeof todo.data !== "object") return null;

      // Get associated list ID
      const listLinks = await graph.link.findFrom(input.id, "taskToList");
      const listId = listLinks[0]?.toId ?? null;

      return {
        ...todo,
        listId,
      };
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
        listId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      console.log("📝 Creating todo with input:", input);
      const { listId, ...todoData } = input;

      const created = await graph.element.create({
        typeId: "todo" as const,
        data: {
          title: todoData.title,
          description: todoData.description ?? "",
          completed: false,
          sessions: todoData.sessions ?? [],
        },
      });
      console.log("✅ Created todo:", JSON.stringify(created, null, 2));

      // If listId provided, create taskToList link
      if (listId) {
        // Get existing tasks in the list to calculate order
        const existingLinks = await graph.link.findTo(listId, "taskToList");
        const order = existingLinks.length;

        await graph.link.create({
          fromId: created.id,
          toId: listId,
          linkTypeId: "taskToList",
          data: { order },
        });
        console.log("✅ Created taskToList link with order:", order);
      }

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
        listId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, listId, ...updateDataRaw } = input;
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

      // Handle list linking
      if (listId !== undefined) {
        // Delete existing taskToList links for this todo
        const existingLinks = await graph.link.findFrom(id, "taskToList");
        for (const link of existingLinks) {
          await graph.link.delete(link.id);
        }

        // Create new link if listId provided
        if (listId) {
          // Get existing tasks in the list to calculate order
          const existingListLinks = await graph.link.findTo(
            listId,
            "taskToList",
          );
          const order = existingListLinks.length;

          await graph.link.create({
            fromId: id,
            toId: listId,
            linkTypeId: "taskToList",
            data: { order },
          });
          console.log("✅ Created taskToList link with order:", order);
        }
      }

      return updated;
    }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    await graph.element.delete(input);
    return { success: true };
  }),
} satisfies TRPCRouterRecord;
