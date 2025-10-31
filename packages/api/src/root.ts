import type { TRPCRouterRecord } from "@trpc/server";

import { authRouter } from "./router/auth";
import { goalRouter } from "./router/goal";
import { taskListRouter } from "./router/taskList";
import { todoRouter } from "./router/todo";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  todo: todoRouter,
  taskList: taskListRouter,
  goal: goalRouter,
} satisfies TRPCRouterRecord);

// export type definition of API
export type AppRouter = typeof appRouter;
