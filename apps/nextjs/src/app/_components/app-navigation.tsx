"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@acme/ui";

const navigationItems = [
  { href: "/today", label: "Today" },
  { href: "/calendar", label: "Calendar" },
  { href: "/all-tasks", label: "All Tasks" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap transition-colors",
              pathname === item.href
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
