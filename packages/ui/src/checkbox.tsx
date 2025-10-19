"use client";

import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@acme/ui";

export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "h-3 w-3 shrink-0 rounded-[3px] border border-black data-[state=checked]:bg-black",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="text-white"
      />
    </CheckboxPrimitive.Root>
  );
}
