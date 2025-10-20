"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";

import type { CreatableSelectOption } from "./creatable-select";
import { useTRPC } from "~/trpc/react";
import { CreatableSelect } from "./creatable-select";

// Interface for task list data
interface TaskList {
  id: string;
  data: {
    name: string;
    description: string;
  };
}

export function ListFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();

  const { data: taskLists = [] } = useSuspenseQuery(
    trpc.taskList.all.queryOptions(),
  ) as { data: TaskList[] };

  // Get current list filter from URL
  const currentListId = searchParams.get("list") ?? undefined;

  // Convert task lists to options format
  const options: CreatableSelectOption[] = [
    { value: "__none__", label: "All tasks" },
    ...taskLists.map((list: TaskList) => ({
      value: list.id,
      label: list.data.name || "Unnamed List",
    })),
  ];

  const handleListChange = (value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value && value !== "__none__") {
      params.set("list", value);
    } else {
      params.delete("list");
    }

    // Update URL without page reload
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleCreateNew = async (name: string) => {
    try {
      const newList = await trpc.taskList.create.mutate({
        name: name.trim(),
        description: "",
      });

      // Update URL to show the new list
      const params = new URLSearchParams(searchParams.toString());
      params.set("list", (newList as TaskList).id);
      router.push(`?${params.toString()}`, { scroll: false });
      return (newList as TaskList).id;
    } catch (error) {
      console.error("Failed to create list:", error);
      throw error;
    }
  };

  return (
    <div className="mb-4">
      <CreatableSelect
        value={currentListId}
        onChange={handleListChange}
        options={options}
        onCreateNew={handleCreateNew}
        placeholder="Filter by list..."
        label="List Filter"
        className="max-w-xs"
      />
    </div>
  );
}
