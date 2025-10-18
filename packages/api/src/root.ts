import type { TRPCRouterRecord } from "@trpc/server";

import { authRouter } from "./router/auth";
import { todoRouter } from "./router/todo";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  todo: todoRouter,
} satisfies TRPCRouterRecord);

// export type definition of API
export type AppRouter = typeof appRouter;
