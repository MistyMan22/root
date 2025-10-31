import { Suspense } from "react";

import { HydrateClient } from "~/trpc/server";
import { AppLayoutClient } from "./app-layout-client";

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
      <AppLayoutClient showAddButton={showAddButton} email={email}>
        {children}
      </AppLayoutClient>
    </HydrateClient>
  );
}
