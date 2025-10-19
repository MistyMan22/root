"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Checkbox } from "@acme/ui/checkbox";
import { toast } from "@acme/ui/toast";

import type { Session } from "./session-form";
import { useTRPC } from "~/trpc/react";
import { BaseModal } from "./base-modal";
import { SessionsList } from "./sessions-list";

type Todo = RouterOutputs["todo"]["byId"];

// Simple markdown-like rendering for basic formatting
function MarkdownRenderer({ content }: { content: string }) {
  if (!content.trim()) return null;

  // Split by double newlines to create paragraphs
  const paragraphs = content.split(/\n\s*\n/);

  return (
    <div className="prose prose-sm max-w-none">
      {paragraphs.map((paragraph, index) => {
        if (!paragraph.trim()) return null;

        // Handle single line breaks within paragraphs
        const lines = paragraph.split("\n");

        return (
          <p key={index} className="mb-3 last:mb-0">
            {lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function TodoForm(props: {
  initial?: { title: string; description?: string; sessions?: Session[] };
  onSubmit: (values: {
    title: string;
    description?: string;
    sessions?: Session[];
  }) => void;
  submitLabel?: string;
  pending?: boolean;
  initialFocusRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const {
    initial = { title: "", description: "", sessions: [] },
    onSubmit,
    submitLabel = "Save",
    pending,
    initialFocusRef,
  } = props;
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [sessions, setSessions] = useState<Session[]>(() => {
    // If no sessions provided, create a default session for today
    if (!initial.sessions || initial.sessions.length === 0) {
      const today = new Date();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      return [
        {
          startTimeDate: todayString,
          time: null,
          duration: null,
          status: "planned",
          notes: "",
        },
      ];
    }
    return initial.sessions;
  });

  // Focus the input when component mounts
  React.useEffect(() => {
    const focusInput = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      }
    };

    // Small delay to ensure the input is rendered
    const timeoutId = setTimeout(focusInput, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleAddSession = (session: Session) => {
    setSessions((prev) => [...prev, session]);
  };

  const handleUpdateSession = (index: number, session: Session) => {
    setSessions((prev) => prev.map((s, i) => (i === index ? session : s)));
  };

  const handleDeleteSession = (index: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ title, description, sessions });
      }}
      className="space-y-4"
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="todo-title" className="block text-xs font-medium">
            Title
          </label>
          <input
            ref={initialFocusRef}
            id="todo-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            required
            autoFocus
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="todo-description"
            className="block text-xs font-medium"
          >
            Description
          </label>
          <textarea
            id="todo-description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, notes, or context..."
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Sessions Section */}
        <div className="border-t pt-4">
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-900">
              Sessions ({sessions.length})
            </h3>
          </div>

          <SessionsList
            sessions={sessions}
            onUpdateSession={handleUpdateSession}
            onDeleteSession={handleDeleteSession}
            onAddSession={handleAddSession}
            pending={pending}
          />
        </div>
      </div>

      {/* Update Button at Bottom */}
      <div className="border-t pt-4">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function TaskPage({ todoId }: { todoId: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const initialFocusRef = useRef<HTMLInputElement | null>(null);

  const { data: todo } = useSuspenseQuery(
    trpc.todo.byId.queryOptions({ id: todoId }),
  );

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
        router.push("/");
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
      id: todo.id,
      completed: !todo.data.completed,
    });
  };

  if (!todo) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Task not found</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/")}
          className="flex items-center gap-2"
        >
          ← Home
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => deleteTodo.mutate(todo.id)}
            disabled={deleteTodo.isPending}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Task Content */}
      <div className="space-y-6">
        {/* Title and Status */}
        <div className="flex items-start gap-4">
          <Checkbox
            checked={!!todo.data.completed}
            onCheckedChange={handleToggleComplete}
            disabled={updateTodo.isPending}
            className="mt-1"
          />
          <div className="flex-1">
            <h1
              className={cn(
                "text-2xl font-bold",
                todo.data.completed === true && "line-through opacity-60",
              )}
            >
              {typeof todo.data.title === "string"
                ? todo.data.title
                : "Untitled"}
            </h1>
          </div>
        </div>

        {/* Description */}
        {todo.data.description && (
          <div className="rounded-lg border bg-gray-50 p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">
              Description
            </h2>
            <MarkdownRenderer content={todo.data.description} />
          </div>
        )}

        {/* Sessions */}
        {todo.data.sessions && todo.data.sessions.length > 0 && (
          <div className="rounded-lg border bg-gray-50 p-4">
            <h2 className="mb-3 text-sm font-medium text-gray-700">
              Sessions ({todo.data.sessions.length})
            </h2>
            <SessionsList
              sessions={todo.data.sessions}
              onUpdateSession={() => {}} // Read-only in this view
              onDeleteSession={() => {}} // Read-only in this view
              onAddSession={() => {}} // Read-only in this view
              pending={false}
              readOnly
            />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <BaseModal
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Task"
        initialFocusRef={initialFocusRef as React.RefObject<HTMLElement>}
      >
        <TodoForm
          initial={{
            title: typeof todo.data.title === "string" ? todo.data.title : "",
            description:
              typeof todo.data.description === "string"
                ? todo.data.description
                : "",
            sessions: todo.data.sessions ?? [],
          }}
          submitLabel="Update"
          pending={updateTodo.isPending}
          initialFocusRef={initialFocusRef}
          onSubmit={(values) =>
            updateTodo.mutate(
              { id: todo.id, ...values },
              { onSuccess: () => setIsEditing(false) },
            )
          }
        />
      </BaseModal>
    </div>
  );
}
