import { Suspense } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { AddTodoButton, TodoCardSkeleton, TodoList } from "./_components/todos";

export default async function HomePage() {
  prefetch(trpc.todo.all.queryOptions());
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  return (
    <HydrateClient>
      <main className="container max-w-3xl py-8">
        <header className="flex items-center justify-between border-b pb-4">
          <h1 className="text-xl font-semibold tracking-tight">Root</h1>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal" />
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </header>

        {email === "wrwwhite@gmail.com" ? (
          <>
            <section className="mt-6">
              <AddTodoButton />
            </section>

            <section className="mt-2">
              <div className="w-full">
                <Suspense
                  fallback={
                    <div className="flex w-full flex-col">
                      <TodoCardSkeleton />
                      <TodoCardSkeleton />
                      <TodoCardSkeleton />
                    </div>
                  }
                >
                  <TodoList />
                </Suspense>
              </div>
            </section>
          </>
        ) : (
          <section className="text-muted-foreground mt-6 text-sm">
            Nothing to see here.
          </section>
        )}
      </main>
    </HydrateClient>
  );
}
