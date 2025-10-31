"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";

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

export const ListFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: taskLists = [] } = useSuspenseQuery(
    trpc.taskList.all.queryOptions(),
  ) as { data: TaskList[] };

  // Get current list filter from URL
  const currentListId = searchParams.get("list") ?? undefined;
  const isFiltered = !!currentListId;

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

  // Mutation hook for creating task lists
  const createTaskListMutation = useMutation(
    trpc.taskList.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.taskList.pathFilter());
      },
      onError: (err) => {
        console.error("Failed to create list:", err);
      },
    }),
  );

  const handleCreateNew = async (name: string) => {
    try {
      const newList = (await createTaskListMutation.mutateAsync({
        name: name.trim(),
        description: "",
      })) as TaskList;

      // Update URL to show the new list
      const params = new URLSearchParams(searchParams.toString());
      params.set("list", newList.id);
      router.push(`?${params.toString()}`, { scroll: false });
      return newList.id;
    } catch (error) {
      console.error("Failed to create list:", error);
      throw error;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isFiltered && (
        <MixerHorizontalIcon className="h-4 w-4 text-gray-500" />
      )}
      <CreatableSelect
        value={currentListId}
        onChange={handleListChange}
        options={options}
        onCreateNew={handleCreateNew}
        placeholder="Filter..."
        compact
        className="w-[140px]"
      />
    </div>
  );
};

// AGENT NOTES: ListFilter
// - Compact filter control designed for header placement; shows active filter state visually with icon when filtered.
// - Uses mutation hook pattern for list creation to match React Query conventions.
// - Updated 2025-10-31: redesigned for sleeker header placement, removed label, added filter icon indicator, compact sizing.
