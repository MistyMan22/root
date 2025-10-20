import { currentUser } from "@clerk/nextjs/server";

import { prefetch, trpc } from "~/trpc/server";
import { AppLayout } from "../_components/app-layout";
import { CalendarView } from "../_components/calendar-view";

export default async function CalendarPage() {
  await prefetch(trpc.todo.all.queryOptions());
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  return (
    <AppLayout email={email} showAddButton={false}>
      <CalendarView />
    </AppLayout>
  );
}
