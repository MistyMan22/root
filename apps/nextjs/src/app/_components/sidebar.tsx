"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HamburgerMenuIcon, Cross2Icon } from "@radix-ui/react-icons";

import { cn } from "@acme/ui";

const sidebarItems = [
  { href: "/tasks", label: "Tasks" },
  { href: "/goals", label: "Goals" },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

export const Sidebar = ({ isOpen, onToggle, isMobile }: SidebarProps) => {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (isMobile && isOpen && pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = pathname;
      onToggle();
    } else {
      prevPathnameRef.current = pathname;
    }
  }, [pathname, isMobile, isOpen, onToggle]);

  // Handle overlay click (mobile only)
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobile, isOpen]);

  return (
    <>
      {/* Hamburger Button */}
      <button
        data-hamburger
        onClick={onToggle}
        className="mr-3 h-9 w-9 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
        aria-label="Toggle sidebar"
      >
        <HamburgerMenuIcon className="h-5 w-5 text-gray-700" />
      </button>

      {/* Overlay - Mobile only */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        data-sidebar
        className={cn(
          // Desktop: part of layout, starts below header
          "hidden md:block md:fixed md:top-[73px] md:left-0 md:h-[calc(100vh-73px)] md:w-64 md:bg-white md:border-r md:border-gray-200 md:z-30 md:transform md:transition-transform md:duration-300 md:ease-in-out",
          // Mobile: overlay drawer, full height
          isMobile && "fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out",
          // State-based transforms
          isMobile
            ? isOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : isOpen
              ? "translate-x-0"
              : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Mobile close button */}
          {isMobile && (
            <div className="flex items-center justify-end p-4">
              <button
                onClick={onToggle}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Close sidebar"
              >
                <Cross2Icon className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {sidebarItems.map((item) => {
                const isActive =
                  item.href === "/tasks"
                    ? pathname.startsWith("/today") ||
                      pathname.startsWith("/calendar") ||
                      pathname.startsWith("/all-tasks") ||
                      pathname === "/tasks"
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-purple-100 text-purple-700"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
};

// AGENT NOTES: Sidebar
// - Persistent sidebar that defaults to open on desktop, closed on mobile
// - Desktop: fixed position below header, part of layout, pushes content (via margin in app-layout)
// - Mobile: overlay drawer that slides in from left
// - Uses localStorage to persist sidebar state across sessions on desktop
// - Hamburger menu button triggers open/close state
// - No "Navigation" header - just navigation items directly
// - Overlay backdrop only on mobile
// - Navigation items: Tasks (default) and Goals, with active state highlighting (purple background)
// - Tasks routes include /today, /calendar, /all-tasks, and /tasks
// - Uses Radix icons for hamburger and close buttons
// - Prevents body scroll when sidebar is open on mobile
