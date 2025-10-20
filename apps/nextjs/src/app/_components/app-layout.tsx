import { Suspense } from "react";

import { HydrateClient } from "~/trpc/server";
import { AppNavigation } from "./app-navigation";
import { ListFilter } from "./list-filter";
import { AddTodoButton, TodoCardSkeleton } from "./todos";
import { AuthSection } from "./auth-section";

interface AppLayoutProps {
  children: React.ReactNode;
  showAddButton?: boolean;
  email?: string | null;
}

export function AppLayout({
  children,
  showAddButton = true,
  email,
}: AppLayoutProps) {
  return (
    <HydrateClient>
      <main className="container max-w-3xl py-8">
        <header className="flex items-center justify-between border-b pb-4">
          <h1 className="text-xl font-semibold tracking-tight">Root</h1>
          <AuthSection />
        </header>

        {email === "wrwwhite@gmail.com" ? (
          <>
            <ListFilter />
            <AppNavigation />

            {showAddButton && (
              <section className="mt-6">
                <AddTodoButton />
              </section>
            )}

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
                  {children}
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
