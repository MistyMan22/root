import { currentUser } from "@clerk/nextjs/server";

import { prefetch, trpc } from "~/trpc/server";
import { AppLayout } from "../_components/app-layout";
import { TodayView } from "../_components/today-view";

export default async function TasksPage() {
  await prefetch(trpc.todo.all.queryOptions());
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  return (
    <AppLayout email={email}>
      <TodayView />
    </AppLayout>
  );
}

