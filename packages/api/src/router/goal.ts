import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { graph } from "@acme/db/graph";

import { protectedProcedure, publicProcedure } from "../trpc";

export const goalRouter = {
  all: publicProcedure.query(async () => {
    const goals = await graph.element.findByType("goal");
    return goals;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().max(256),
        description: z.string().optional(),
        date: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const created = await graph.element.create({
        typeId: "goal" as const,
        data: {
          title: input.name,
          description: input.description ?? "",
          date: input.date ?? null,
          state: [],
        },
      });
      return created;
    }),

  delete: protectedProcedure.input(z.string()).mutation(async ({ input }) => {
    await graph.element.delete(input);
    return { success: true };
  }),
} satisfies TRPCRouterRecord;

