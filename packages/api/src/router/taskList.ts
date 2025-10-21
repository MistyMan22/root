import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { graph } from "@acme/db/graph";

import { protectedProcedure, publicProcedure } from "../trpc";

export const taskListRouter = {
  all: publicProcedure.query(async () => {
    const taskLists = await graph.element.findByType("taskList");
    console.log(
      "🔍 Raw task lists from graph DB:",
      JSON.stringify(taskLists, null, 2),
    );
    return taskLists;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().max(256),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      console.log("📝 Creating task list with input:", input);
      const created = await graph.element.create({
        typeId: "taskList" as const,
        data: {
          name: input.name,
          description: input.description ?? "",
        },
      });
      console.log("✅ Created task list:", JSON.stringify(created, null, 2));

      return created;
    }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    // First, delete all links from tasks to this list
    const links = await graph.link.findTo(input, "taskToList");
    for (const link of links) {
      await graph.link.delete(link.id);
    }

    // Then delete the list itself
    await graph.element.delete(input);
    return { success: true };
  }),
} satisfies TRPCRouterRecord;

