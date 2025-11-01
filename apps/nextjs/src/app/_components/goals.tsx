"use client";

import { useRef, useState, type FormEvent } from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";
import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";
import { BaseModal } from "./base-modal";

type Goal = RouterOutputs["goal"]["all"][number];

const GoalForm = (props: {
  initial?: {
    name: string;
    description?: string;
  };
  onSubmit: (values: {
    name: string;
    description?: string;
  }) => void;
  submitLabel?: string;
  pending?: boolean;
  initialFocusRef?: React.RefObject<HTMLInputElement>;
}) => {
  const { initial, onSubmit, submitLabel = "Add Goal", pending, initialFocusRef } = props;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="goal-name"
            className="block text-sm font-medium text-gray-700"
          >
            Name
          </label>
          <Input
            ref={initialFocusRef}
            id="goal-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Goal name"
            required
            autoFocus
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="goal-description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="goal-description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Goal description"
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <Button
          type="submit"
          disabled={pending}
          className="w-full py-3 text-base"
        >
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export const CreateGoalForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const initialFocusRef = useRef<HTMLInputElement | null>(null);

  const createGoal = useMutation(
    trpc.goal.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.goal.pathFilter());
        onSuccess?.();
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to create goals"
            : "Failed to create goal",
        );
      },
    }),
  );

  return (
    <GoalForm
      initial={{ name: "", description: "" }}
      onSubmit={(values) => createGoal.mutate(values)}
      submitLabel="Add Goal"
      pending={createGoal.isPending}
      initialFocusRef={initialFocusRef}
    />
  );
};

export const AddGoalButton = () => {
  const [open, setOpen] = useState(false);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white font-bold text-lg px-8 py-4 border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 hover:from-purple-700 hover:via-pink-600 hover:to-purple-700 bg-[length:200%_100%] hover:bg-[position:100%_0]"
        onClick={() => setOpen(true)}
      >
        <span className="relative z-10 flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Add Goal
        </span>
        <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </Button>
      <BaseModal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Goal"
        initialFocusRef={initialFocusRef as React.RefObject<HTMLElement>}
      >
        <CreateGoalForm onSuccess={() => setOpen(false)} />
      </BaseModal>
    </>
  );
};

export const GoalsList = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: goals = [] } = useSuspenseQuery(trpc.goal.all.queryOptions());

  const deleteGoal = useMutation(
    trpc.goal.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.goal.pathFilter());
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to delete goals"
            : "Failed to delete goal",
        );
      },
    }),
  );

  if (goals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No goals yet. Add your first goal!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {goals.map((goal) => {
        const goalData = goal.data as { title?: string; description?: string };
        return (
          <div
            key={goal.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {goalData.title || "Untitled Goal"}
                </h3>
                {goalData.description && (
                  <p className="text-gray-600 mb-2">{goalData.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteGoal.mutate(goal.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// AGENT NOTES: Goals components
// - GoalForm: Form component for creating goals with name, date, and description fields
// - CreateGoalForm: Wrapper that handles TRPC mutation for creating goals
// - AddGoalButton: Button that opens modal with goal creation form
// - GoalsList: Displays list of goals with delete functionality
// - Uses same styling patterns as todo components for consistency

