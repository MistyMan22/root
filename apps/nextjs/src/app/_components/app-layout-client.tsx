"use client";

import { Suspense, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

import { AppNavigation } from "./app-navigation";
import { ListFilter } from "./list-filter";
import { AddTodoButton, TodoCardSkeleton } from "./todos";
import { AuthSection } from "./auth-section";
import { Sidebar } from "./sidebar";
import { AddGoalButton } from "./goals";
import { cn } from "@acme/ui";

interface AppLayoutClientProps {
  children: React.ReactNode;
  showAddButton?: boolean;
  email?: string | null;
}

export function AppLayoutClient({
  children,
  showAddButton = true,
  email,
}: AppLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const isGoalsPage = pathname === "/goals";

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (!mobile) {
        const stored = localStorage.getItem("sidebar-open");
        setSidebarOpen(stored === null ? true : stored === "true");
      } else {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const newValue = !prev;
      if (!isMobile) {
        localStorage.setItem("sidebar-open", String(newValue));
      }
      return newValue;
    });
  };

  return (
    <>
      {/* Top row: Hamburger | Logo | Add Task/Goal (center, big/bold) | Profile - FULL WIDTH */}
      <header className="flex items-end w-full pt-6 pb-2 px-8 z-40 relative bg-white">
        <div className="flex-1 flex justify-start items-end">
          <div className="flex items-center gap-3">
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} isMobile={isMobile} />
            {(!sidebarOpen || isMobile) && (
              <h1 className="text-xl font-normal tracking-tight text-gray-800">root</h1>
            )}
            {!isMobile && sidebarOpen && (
              <>
                <h1 className="text-xl font-normal tracking-tight text-gray-800">root</h1>
                <div className="flex-1" />
              </>
            )}
          </div>
        </div>
        <div className="flex-1 flex justify-center items-end">
          {showAddButton && (isGoalsPage ? <AddGoalButton /> : <AddTodoButton />)}
        </div>
        <div className="flex-1 flex justify-end items-end">
          <AuthSection />
        </div>
      </header>

      <main
        className={cn(
          "container max-w-5xl pt-4 pb-8 mx-auto md:transition-all md:duration-300",
          !isMobile && sidebarOpen && "md:ml-[272px]"
        )}
      >
        {/* Second row: Navigation tabs | Filter (single divider line) - Hidden on goals page */}
        {email === "wrwwhite@gmail.com" && !isGoalsPage && (
          <div className="flex items-center justify-between border-b border-gray-200 pb-1">
            <AppNavigation />
            <ListFilter />
          </div>
        )}

        {email === "wrwwhite@gmail.com" ? (
          <>
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
    </>
  );
}
