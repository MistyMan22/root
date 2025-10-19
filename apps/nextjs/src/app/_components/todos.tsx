"use client";

import { useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Checkbox } from "@acme/ui/checkbox";
// Simplified form – not using Field primitives for now
import { Input } from "@acme/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@acme/ui/select";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

type Priority = "low" | "medium" | "high";

function TodoForm(props: {
  initial?: { title: string; priority: Priority };
  onSubmit: (values: { title: string; priority: Priority }) => void;
  submitLabel?: string;
  pending?: boolean;
}) {
  const {
    initial = { title: "", priority: "medium" },
    onSubmit,
    submitLabel = "Save",
    pending,
  } = props;
  const [title, setTitle] = useState(initial.title);
  const [priority, setPriority] = useState<Priority>(initial.priority);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ title, priority });
      }}
    >
      <div className="space-y-1">
        <label htmlFor="todo-title" className="block text-xs font-medium">
          Title
        </label>
        <Input
          id="todo-title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="todo-priority" className="block text-xs font-medium">
          Priority
        </label>
        <Select
          value={priority}
          onValueChange={(v) => setPriority(v as Priority)}
        >
          <SelectTrigger id="todo-priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

export function CreateTodoForm() {
  const trpc = useTRPC();

  const queryClient = useQueryClient();

  const createTodo = useMutation(
    trpc.todo.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.todo.pathFilter());
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to create todos"
            : "Failed to create todo",
        );
      },
    }),
  );

  return (
    <TodoForm
      onSubmit={(values) => createTodo.mutate(values)}
      submitLabel="Add Task"
      pending={createTodo.isPending}
    />
  );
}

export function AddTodoButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        className="border-black text-black"
        onClick={() => setOpen(true)}
      >
        Add Task
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-md bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">Add Task</h2>
              <button
                className="text-xs underline"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <CreateTodoForm />
          </div>
        </div>
      )}
    </div>
  );
}

export function TodoList() {
  const trpc = useTRPC();
  const { data: todos } = useSuspenseQuery(trpc.todo.all.queryOptions());

  if (todos.length === 0) {
    return <div className="text-muted-foreground text-sm">No tasks yet.</div>;
  }

  return (
    <div className="flex w-full flex-col divide-y">
      {todos.map((todo) => {
        return <TodoCard key={todo.id} todo={todo} />;
      })}
    </div>
  );
}

type Todo = RouterOutputs["todo"]["all"][number];

export function TodoCard(props: { todo: Todo }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const updateTodo = useMutation(
    trpc.todo.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.todo.pathFilter());
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to update todos"
            : "Failed to update todo",
        );
      },
    }),
  );

  const deleteTodo = useMutation(
    trpc.todo.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.todo.pathFilter());
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to delete todos"
            : "Failed to delete todo",
        );
      },
    }),
  );

  const handleToggleComplete = () => {
    updateTodo.mutate({
      id: props.todo.id,
      completed: !props.todo.data.completed,
    });
  };

  return (
    <div
      className={cn(
        "flex flex-row items-center py-3",
        props.todo.data.completed === true && "opacity-60",
      )}
    >
      <div className="flex grow items-center gap-3">
        <Checkbox
          checked={!!props.todo.data.completed}
          onCheckedChange={handleToggleComplete}
          disabled={updateTodo.isPending}
        />
        <div className="flex-1">
          <h2
            className={cn(
              "text-base font-medium",
              props.todo.data.completed === true && "line-through",
            )}
          >
            {typeof props.todo.data.title === "string"
              ? props.todo.data.title
              : "Untitled"}
          </h2>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {props.todo.data.priority as string}
          </div>
        </div>
      </div>
      <div className="ml-4 flex items-center gap-3">
        <button
          className="text-xs underline"
          onClick={() => setIsEditing(true)}
        >
          Edit
        </button>
        <button
          className="text-xs text-red-600 underline"
          onClick={() => deleteTodo.mutate(props.todo.id)}
          disabled={deleteTodo.isPending}
        >
          Delete
        </button>
      </div>
      {isEditing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-md bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">
                Edit Task
              </h2>
              <button
                className="text-xs underline"
                onClick={() => setIsEditing(false)}
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <TodoForm
              initial={{
                title: String(props.todo.data.title ?? ""),
                priority: (props.todo.data.priority as Priority) ?? "medium",
              }}
              submitLabel="Update"
              pending={updateTodo.isPending}
              onSubmit={(values) =>
                updateTodo.mutate(
                  { id: props.todo.id, ...values },
                  { onSuccess: () => setIsEditing(false) },
                )
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function TodoCardSkeleton(props: { pulse?: boolean }) {
  const { pulse = true } = props;
  return (
    <div className="flex flex-row items-center py-3">
      <div className="flex grow items-center gap-3">
        <div
          className={cn(
            "h-4 w-4 rounded border-2 bg-gray-300",
            pulse && "animate-pulse",
          )}
        />
        <div className="flex-1">
          <h2
            className={cn(
              "w-1/4 rounded-sm bg-black/70 text-base",
              pulse && "animate-pulse",
            )}
          >
            &nbsp;
          </h2>
          <div
            className={cn(
              "mt-0.5 w-1/6 rounded-sm bg-black/30 text-xs",
              pulse && "animate-pulse",
            )}
          >
            &nbsp;
          </div>
        </div>
      </div>
    </div>
  );
}
