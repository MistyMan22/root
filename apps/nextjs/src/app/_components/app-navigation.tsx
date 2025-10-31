"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@acme/ui";

const navigationItems = [
  { href: "/today", label: "Day" },
  { href: "/calendar", label: "Calendar" },
  { href: "/all-tasks", label: "All Tasks" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="-mb-px flex space-x-8">
      {navigationItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "border-b-2 px-1 py-2 text-sm font-normal whitespace-nowrap transition-colors",
            pathname === item.href
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-gray-600 hover:border-gray-400 hover:text-gray-900",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// AGENT NOTES: AppNavigation
// - Horizontal navigation tabs for app views; border removed from wrapper as parent now provides single divider.
// - Updated 2025-10-31: removed border wrapper, made inline for header placement with filter.


