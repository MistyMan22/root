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

export function CreateTodoForm() {
  const trpc = useTRPC();

  const queryClient = useQueryClient();
  type Priority = "low" | "medium" | "high";
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  const createTodo = useMutation(
    trpc.todo.create.mutationOptions({
      onSuccess: async () => {
        setTitle("");
        setPriority("medium");
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
    <form
      className="w-full max-w-2xl space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        createTodo.mutate({ title, priority });
      }}
    >
      <div className="space-y-1">
        <label htmlFor="todo-title" className="block text-sm font-medium">
          Todo Title
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
        <label htmlFor="todo-priority" className="block text-sm font-medium">
          Priority
        </label>
        <Select
          value={priority}
          onValueChange={(v) => setPriority(v as Priority)}
        >
          <SelectTrigger id="todo-priority">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={createTodo.isPending}>
        {createTodo.isPending ? "Adding..." : "Add Todo"}
      </Button>
    </form>
  );
}

export function TodoList() {
  const trpc = useTRPC();
  const { data: todos } = useSuspenseQuery(trpc.todo.all.queryOptions());

  if (todos.length === 0) {
    return (
      <div className="relative flex w-full flex-col gap-4">
        <TodoCardSkeleton pulse={false} />
        <TodoCardSkeleton pulse={false} />
        <TodoCardSkeleton pulse={false} />

        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10">
          <p className="text-2xl font-bold text-white">No todos yet</p>
          <p className="text-sm text-white/80">Add your first todo above!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div
      className={cn(
        "bg-muted flex flex-row items-center rounded-lg p-4 transition-all",
        props.todo.data.completed === true && "opacity-60",
      )}
    >
      <div className="flex grow items-center space-x-3">
        <Checkbox
          checked={!!props.todo.data.completed}
          onCheckedChange={handleToggleComplete}
          disabled={updateTodo.isPending}
        />
        <div className="flex-1">
          <h2
            className={cn(
              "text-primary text-xl font-semibold",
              props.todo.data.completed === true && "line-through",
            )}
          >
            {typeof props.todo.data.title === "string"
              ? props.todo.data.title
              : "Untitled"}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-medium tracking-wide uppercase",
                getPriorityColor(props.todo.data.priority as string),
              )}
            >
              {props.todo.data.priority as string}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(props.todo.data.completionDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary cursor-pointer text-sm font-bold uppercase hover:bg-transparent hover:text-white"
          onClick={() => deleteTodo.mutate(props.todo.id)}
          disabled={deleteTodo.isPending}
        >
          {deleteTodo.isPending ? "..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}

export function TodoCardSkeleton(props: { pulse?: boolean }) {
  const { pulse = true } = props;
  return (
    <div className="bg-muted flex flex-row items-center rounded-lg p-4">
      <div className="flex grow items-center space-x-3">
        <div
          className={cn(
            "h-4 w-4 rounded border-2 bg-gray-300",
            pulse && "animate-pulse",
          )}
        />
        <div className="flex-1">
          <h2
            className={cn(
              "bg-primary w-1/4 rounded-sm text-xl font-semibold",
              pulse && "animate-pulse",
            )}
          >
            &nbsp;
          </h2>
          <div
            className={cn(
              "mt-1 w-1/6 rounded-sm bg-current text-xs",
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
