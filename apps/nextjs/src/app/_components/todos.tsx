"use client";

import { useRef, useState } from "react";
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
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";
import { BaseModal } from "./base-modal";

function TodoForm(props: {
  initial?: { title: string };
  onSubmit: (values: { title: string }) => void;
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

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ title });
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
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);
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
      <BaseModal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Task"
        initialFocusRef={initialFocusRef as React.RefObject<HTMLElement>}
      >
        <CreateTodoForm />
      </BaseModal>
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
    <div className="flex w-full flex-col">
      {todos.map((todo) => {
        return <TodoCard key={todo.id} todo={todo} />;
      })}
    </div>
  );
}

type Todo = RouterOutputs["todo"]["all"][number];

export function TodoCard(props: { todo: Todo }) {
  console.log("🔍 Todo card props:", props);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);

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
        "group flex flex-row items-center py-1",
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
        </div>
      </div>
      <div className="ml-4 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
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
      <BaseModal
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Task"
        initialFocusRef={initialFocusRef as React.RefObject<HTMLElement>}
      >
        <TodoForm
          initial={{
            title:
              typeof props.todo.data.title === "string"
                ? props.todo.data.title
                : "",
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
      </BaseModal>
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
