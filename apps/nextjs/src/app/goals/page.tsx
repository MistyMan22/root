import { currentUser } from "@clerk/nextjs/server";

import { prefetch, trpc } from "~/trpc/server";
import { AppLayout } from "../_components/app-layout";
import { GoalsList } from "../_components/goals";

export default async function GoalsPage() {
  await prefetch(trpc.goal.all.queryOptions());
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  return (
    <AppLayout email={email} showAddButton={true}>
      <div className="space-y-6">
        <GoalsList />
      </div>
    </AppLayout>
  );
}
