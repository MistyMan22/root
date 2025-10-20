import { currentUser } from "@clerk/nextjs/server";

import { prefetch, trpc } from "~/trpc/server";
import { AllTasksView } from "../_components/all-tasks-view";
import { AppLayout } from "../_components/app-layout";

export default async function AllTasksPage() {
  await prefetch(trpc.todo.all.queryOptions());
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  return (
    <AppLayout email={email}>
      <AllTasksView />
    </AppLayout>
  );
}
